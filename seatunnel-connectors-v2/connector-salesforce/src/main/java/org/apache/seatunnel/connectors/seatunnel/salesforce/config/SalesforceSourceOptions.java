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

package org.apache.seatunnel.connectors.seatunnel.salesforce.config;

import org.apache.seatunnel.api.configuration.Option;
import org.apache.seatunnel.api.configuration.Options;

/** Options that only apply to the Salesforce source. */
public class SalesforceSourceOptions {

    public static final Option<String> QUERY =
            Options.key("query")
                    .stringType()
                    .noDefaultValue()
                    .withDescription(
                            "The SOQL statement used to read records, e.g. "
                                    + "\"SELECT Id, Name FROM Account\". The selected fields must "
                                    + "match the configured schema.");

    public static final Option<Integer> QUERY_BATCH_SIZE =
            Options.key("query_batch_size")
                    .intType()
                    .defaultValue(2000)
                    .withDescription(
                            "The number of records requested from Salesforce per page via the "
                                    + "Sforce-Query-Options batch size header (max 2000).");

    private SalesforceSourceOptions() {}
}
