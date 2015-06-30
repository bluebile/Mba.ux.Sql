/**
 * @class SisuTec.util.SqliteNative
 * @extends Ext.data.proxy.Sql
 * @Data 09/04/2015
 * @Ultima_revisão: dd/mm/yyyy
 *
 * Acrescente comentario indicando o que a classe faz, seu comportamento e responsabilidade
 */
Ext.define('Mba.ux.Sql', {
    extend: 'Ext.data.proxy.Sql',
    alias: 'proxy.sql-improvements',
    xtype: 'sqlimprovements',
    requires: [ 'Mba.ux.Model' ],

    mixins: [
        'Mba.ux.BuilderConfig.mixin.BuilderConfig'
    ],

    initialize: function() {
        if (!this.initialConfig.callbackSelectClause) {
            this.initialConfig.callbackSelectClause = this.generateSqlSelect;
        }

        if (!this.initialConfig.callbackWhereClause) {
            this.initialConfig.callbackWhereClause = this.generateWhereClause;
        }

        if (!this.initialConfig.callbackOrderClause) {
            this.initialConfig.callbackOrderClause = this.generateOrderClause;
        }

        this.initConfig(this.initialConfig);
        this.initialized = true;
    },

    config: {
        columnsSelect: '*',
        callbackSelectClause: null,
        callbackWhereClause: null,
        callbackOrderClause: null,
        fieldsMap: 'defaut',
        fieldsMappingMap: 'defaut'
    },

    applyColumnsSelect: function(fields) {
        var flag = false;
        if (Ext.isString(fields)) {
            if (fields !== '*') {
                return fields;
            }
            flag = true;
        }
        var sql = [], str;

        this.getModel().getFields().each(function(element, index) {

            if (Ext.isArray(fields)) {
                flag = false;
                if (Ext.Array.contains(fields,element.getName())) {
                    flag = true;
                }
            }
            if (flag && (element.getPersist() || (!element.getPersist() && element.getMapping()))) {
                str = element.getName();
                if (element.getMapping()) {
                    str = element.getMapping() + ' AS ' + element.getName();
                }

                sql.push(str);

            }
        });
        return sql.join(', ');
    },

    getPersistedModelColumns: function(model) {
        var fields = model.getFields().items,
            uniqueIdStrategy = this.getUniqueIdStrategy(),
            idProperty = model.getIdProperty(),
            columns = [],
            ln = fields.length,
            i, field, name,tmpValue;

        for (i = 0; i < ln; i++) {
            field = fields[i];
            name = field.getName();

            if (name === idProperty && !uniqueIdStrategy) {
                continue;
            }

            if (field.getPersist()) {
                tmpValue = field.getName();
                if (field.getMapping()) {
                    tmpValue = field.getMapping();
                }
                columns.push(tmpValue);
            }
        }
        return columns;
    },

    generateSqlSelect: function(params) {
        var me = this,
            table = me.getTable(),
            sql = 'SELECT ' + this.getColumnsSelect() + ' FROM ' + table,
            idProperty = me.getModel().getIdProperty(),
            sortStatement = ' ORDER BY ',
            whereClause, orderClause;

        if (!Ext.isObject(params)) {
            sql += filterStatement + idProperty + ' = ' + params;
        } else {
            sql += this.getCallbackWhereClause().apply(me, [params]);
            sql += this.getCallbackOrderClause().apply(me, [params]);

            // handle start, limit, sort, filter and group params
            if (params.page != undefined) {
                sql += ' LIMIT ' + parseInt(params.start, 10) + ', ' + parseInt(params.limit, 10);
            }
        }

        return sql;
    },

    generateOrderClause: function(params)
    {
        var ln, property, sorter, i,
            sql = '',
            sortStatement = ' ';

        ln = params.sorters && params.sorters.length;
        if (ln) {
            for (i = 0; i < ln; i++) {
                sorter = params.sorters[i];
                property = sorter.getProperty();
                if (property != null) {
                    sql += sortStatement + property + ' ' + sorter.getDirection();
                    sortStatement = ', ';
                }
            }
        }

        return sql.length > 0 ? ' ORDER BY ' + sql: sql;
    },

    applyFieldsMap: function() {
        var map = Ext.create('Ext.util.HashMap');
        this.getModel().getFields().all.forEach(function(element, index, array) {
            var value = element.getMapping();
            if (value == null) {
                value = element.getName();
            }
            map.add(element.getName(),value);
        });
        return map;
    },

    applyFieldsMappingMap: function() {
        var map = Ext.create('Ext.util.HashMap');
        this.getModel().getFields().all.forEach(function(element, index, array) {
            var value = element.getMapping();
            if (value == null) {
                value = element.getName();
            }
            if (!map.containsKey(value)) {
                 map.add(value,element);
            }
        });
        return map;
    },

    getColumnValues: function(columns, data) {
        var ln = columns.length,
            values = [],
            i, column, value;

        for (i = 0; i < ln; i++) {
            column = this.getFieldsMappingMap().get(columns[i]).getName();
            value = data[column];
            if (column == this.getModel().getIdProperty()) {
                value = data[this.getModel().prototype.config.idProperty.name];
            }
            console.log(value);
            if (value !== 'undefined') {
                values.push(value);
            }
        }
        return values;
    },

    generateWhereClause: function(params)
    {
        var ln, property, value, filter, i,
            sql = '',
            filterStatement = ' ', sqlAnd, orSQL = '', me = this, type = '';

        if (params._filters && params._filters != 'undefined') {
            params.filters = params._filters.items;
        }

        ln = params.filters && params.filters.length;

        if (ln) {
            var map = this.getFieldsMap();
            for (i = 0; i < params.filters.length; i++) {
                filter = params.filters[i];
                property = map.get(filter.getProperty());
                value = filter.getValue();

                if (property != null) {
                    if (Ext.isArray(value)) {
                        if (sqlAnd) {
                            sql += ' AND ';
                        }
                        orSQL = '';
                        Ext.each(value, function(valueEach) {
                            type = me.getFieldsMappingMap().get(property).getType().type;
                            if (!filter.getCaseSensitive() && (type === 'string' || type === 'auto')) {
                                valueEach += '';
                                valueEach = valueEach.toLowerCase();
                                property = 'LOWER(' + property + ')';
                            }
                            if (!filter.getAnyMatch() && (type === 'string' || type === 'auto')) {
                                valueEach = '\'' + valueEach + '\'';
                            }
                            orSQL += property + ' ' + (filter.getAnyMatch() ? ('LIKE \'%' +
                                valueEach + '%\'') : ('= ' + valueEach)) + ' OR ';
                        });
                        sql += '(' + orSQL.substring(0, orSQL.length - 3)  + ')';
                    } else {
                        sqlAnd = true;
                        type = me.getFieldsMappingMap().get(property).getType().type;
                        if (!filter.getCaseSensitive() && (type === 'string' || type === 'auto')) {
                            value = value.toLowerCase();
                            property = 'LOWER(' + property + ')';
                        }
                        if (!filter.getAnyMatch() && (type === 'string' || type === 'auto')) {
                            value = '\'' + value + '\'';
                        }
                        sql += filterStatement + property + ' ' +
                            (filter.getAnyMatch() ? ('LIKE \'%' + value + '%\'') : ('= ' + value));
                    }

                    filterStatement = ' AND ';
                }
            }
        }

        return sql.length > 0 ? ' WHERE ' + sql: sql;
    },

    selectCount: function(transaction, params, result) {
        var me = this,
            table = me.getTable(),
            sql = 'SELECT COUNT(*) count FROM ' + table, whereClause;

        whereClause = this.getCallbackWhereClause().apply(me, [params]);

        if (whereClause) {
            sql += whereClause;
        }

        transaction.executeSql(sql, null,
            function(transaction, resultSet) {
                result.setTotal(resultSet.rows.item(0).count);
            },
            function(transaction, error) {
                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);
            }
        );
    },

    selectRecords: function(transaction, params, callback, scope) {

        var me = this,
            idProperty = me.getModel().getIdProperty(),
            records = [],
            i, data, result, count, rows, ln, sql;

        result = new Ext.data.ResultSet({
            records: records,
            success: true
        });

        sql = this.getCallbackSelectClause().apply(this, [params]);

        transaction.executeSql(sql, null,
            function(transaction, resultSet) {
                rows = resultSet.rows;
                count = rows.length;

                for (i = 0, ln = count; i < ln; i++) {
                    data = rows.item(i);
                    records.push({
                        clientId: null,
                        id: data[idProperty],
                        data: data,
                        node: data
                    });
                }

                result.setSuccess(true);
                result.setTotal(count);
                result.setCount(count);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result);
                }
            },
            function(transaction, error) {
                console.log('Erro no banco:');
                console.log(JSON.stringify(error));
                console.log(sql);
                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );
    },

    read: function(operation, callback, scope) {
        var me = this,
            db = me.getDatabaseObject(),
            model = me.getModel(),
            idProperty = model.getIdProperty(),
            tableExists = me.getTableExists(),
            params = operation.getParams() || {},
            id = params[idProperty],
            sorters = operation.getSorters(),
            filters = operation.getFilters(),
            page = operation.getPage(),
            start = operation.getStart(),
            limit = operation.getLimit(),
            filtered, i, ln;

        params = Ext.apply(params, {
            page: page,
            start: start,
            limit: limit,
            sorters: sorters,
            filters: filters
        });

        operation.setStarted();

        db.transaction(function(transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.selectRecords(transaction, id != undefined ? id : params, function(resultSet, error) {
                    if (operation.process(operation.getAction(), resultSet) == false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                        operation.setException(error);
                    }

                    if (filters && filters.length) {
                        filtered = Ext.create('Ext.util.Collection', function(record) {
                            return record.getId();
                        });
                        filtered.setFilterRoot('data');
                        for (i = 0, ln = filters.length; i < ln; i++) {
                            if (filters[i].getProperty() == null) {
                                filtered.addFilter(filters[i]);
                            }
                        }
                        filtered.addAll(operation.getRecords());

                        operation.setRecords(filtered.items.slice());
                        resultSet.setRecords(operation.getRecords());
                        resultSet.setCount(filtered.items.length);
                        resultSet.setTotal(filtered.items.length);

                        me.selectCount(transaction, params, resultSet);
                    }
                });
            },
            function(transaction, error) {
                me.setException(operation, error);
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function(transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    }
});
