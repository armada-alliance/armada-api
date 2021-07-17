echo "🚀 starting migration..."

set -a # automatically export all variables
source "/environment/$1.$2.env"
set +a

# The code below removes definer syntax causing permission errors for views / procedures and functions
# https://stackoverflow.com/questions/9446783/remove-definer-clause-from-mysql-dumps
# sed -e 's/DEFINER[ ]*=[ ]*[^*]*\*/\*/' | sed -e 's/DEFINER[ ]*=[ ]*[^*]*PROCEDURE/PROCEDURE/' | sed -e 's/DEFINER[ ]*=[ ]*[^*]*FUNCTION/FUNCTION/'
echo "mysqldump -u $MYSQL_USER -p*** -h $MYSQL_HOST -P $MYSQL_PORT $MYSQL_DATABASE --ignore-table=$MYSQL_DATABASE.events > /srv/dump.sql;"
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD -h $MYSQL_HOST -P $MYSQL_PORT $MYSQL_DATABASE --ignore-table=$MYSQL_DATABASE.events | sed -e 's/DEFINER[ ]*=[ ]*[^*]*\*/\*/' | sed -e 's/DEFINER[ ]*=[ ]*[^*]*PROCEDURE/PROCEDURE/' | sed -e 's/DEFINER[ ]*=[ ]*[^*]*FUNCTION/FUNCTION/' | sed -e 's/utf8mb4_0900_ai_ci/utf8mb4_general_ci/g' > /srv/dump.sql;

set -a # automatically export all variables
source "/environment/$1.$3.env"
set +a

echo "mysql -u $MYSQL_USER -p*** -h $MYSQL_HOST -P $MYSQL_PORT $MYSQL_DATABASE < /srv/dump.sql;"
mysql -u $MYSQL_USER -p$MYSQL_PASSWORD -h $MYSQL_HOST -P $MYSQL_PORT $MYSQL_DATABASE < /srv/dump.sql;

rm /srv/dump.sql

echo "✅ migration completed..."