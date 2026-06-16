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

package org.apache.seatunnel.connectors.seatunnel.salesforce.source;

import org.apache.seatunnel.api.configuration.ReadonlyConfig;
import org.apache.seatunnel.api.configuration.util.OptionRule;
import org.apache.seatunnel.api.source.SeaTunnelSource;
import org.apache.seatunnel.api.source.SourceSplit;
import org.apache.seatunnel.api.table.catalog.CatalogTable;
import org.apache.seatunnel.api.table.catalog.CatalogTableUtil;
import org.apache.seatunnel.api.table.catalog.schema.TableSchemaOptions;
import org.apache.seatunnel.api.table.connector.TableSource;
import org.apache.seatunnel.api.table.factory.Factory;
import org.apache.seatunnel.api.table.factory.TableSourceFactory;
import org.apache.seatunnel.api.table.factory.TableSourceFactoryContext;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceBaseOptions;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSourceConfig;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSourceOptions;

import com.google.auto.service.AutoService;

import java.io.Serializable;

@AutoService(Factory.class)
public class SalesforceSourceFactory implements TableSourceFactory {

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
                        SalesforceSourceOptions.QUERY,
                        TableSchemaOptions.SCHEMA)
                .optional(
                        SalesforceBaseOptions.URL,
                        SalesforceBaseOptions.SECURITY_TOKEN,
                        SalesforceBaseOptions.API_VERSION,
                        SalesforceBaseOptions.CONNECT_TIMEOUT_MS,
                        SalesforceBaseOptions.READ_TIMEOUT_MS,
                        SalesforceSourceOptions.QUERY_BATCH_SIZE)
                .build();
    }

    @Override
    public Class<? extends SeaTunnelSource> getSourceClass() {
        return SalesforceSource.class;
    }

    @Override
    public <T, SplitT extends SourceSplit, StateT extends Serializable>
            TableSource<T, SplitT, StateT> createSource(TableSourceFactoryContext context) {
        ReadonlyConfig options = context.getOptions();
        SalesforceSourceConfig config = new SalesforceSourceConfig(options);
        CatalogTable catalogTable = CatalogTableUtil.buildWithConfig(options);
        return () -> (SeaTunnelSource<T, SplitT, StateT>) new SalesforceSource(config, catalogTable);
    }
}
