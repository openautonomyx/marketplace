/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.seatunnel.connectors.seatunnel.salesforce.sink;

import org.apache.seatunnel.api.configuration.util.OptionRule;
import org.apache.seatunnel.api.table.catalog.CatalogTable;
import org.apache.seatunnel.api.table.connector.TableSink;
import org.apache.seatunnel.api.table.factory.Factory;
import org.apache.seatunnel.api.table.factory.TableSinkFactory;
import org.apache.seatunnel.api.table.factory.TableSinkFactoryContext;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceBaseOptions;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSinkConfig;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSinkOptions;

import com.google.auto.service.AutoService;

@AutoService(Factory.class)
public class SalesforceSinkFactory implements TableSinkFactory {

    @Override
    public String factoryIdentifier() {
        return "Salesforce";
    }

    @Override
    public OptionRule optionRule() {
        return OptionRule.builder()
                .required(
                        SalesforceBaseOptions.CLIENT_ID,
                        SalesforceBaseOptions.CLIENT_SECRET,
                        SalesforceBaseOptions.USERNAME,
                        SalesforceBaseOptions.PASSWORD,
                        SalesforceSinkOptions.OBJECT)
                .optional(
                        SalesforceBaseOptions.URL,
                        SalesforceBaseOptions.SECURITY_TOKEN,
                        SalesforceBaseOptions.API_VERSION,
                        SalesforceBaseOptions.CONNECT_TIMEOUT_MS,
                        SalesforceBaseOptions.READ_TIMEOUT_MS,
                        SalesforceSinkOptions.MAX_BATCH_SIZE,
                        SalesforceSinkOptions.ALL_OR_NONE)
                .build();
    }

    @Override
    public TableSink createSink(TableSinkFactoryContext context) {
        CatalogTable catalogTable = context.getCatalogTable();
        SalesforceSinkConfig config = new SalesforceSinkConfig(context.getOptions());
        return () -> new SalesforceSink(config, catalogTable);
    }
}
