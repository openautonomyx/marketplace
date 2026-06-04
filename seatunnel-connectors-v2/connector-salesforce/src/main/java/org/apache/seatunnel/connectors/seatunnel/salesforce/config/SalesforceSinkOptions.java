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

/** Options that only apply to the Salesforce sink. */
public class SalesforceSinkOptions {

    public static final Option<String> OBJECT =
            Options.key("object")
                    .stringType()
                    .noDefaultValue()
                    .withDescription(
                            "The target Salesforce sObject the records are written to, "
                                    + "e.g. Account or Contact.");

    public static final Option<Integer> MAX_BATCH_SIZE =
            Options.key("max_batch_size")
                    .intType()
                    .defaultValue(200)
                    .withDescription(
                            "The maximum number of records flushed in a single composite "
                                    + "request. The Salesforce composite sObject API caps this at 200.");

    public static final Option<Boolean> ALL_OR_NONE =
            Options.key("all_or_none")
                    .booleanType()
                    .defaultValue(false)
                    .withDescription(
                            "When true, a composite batch is rolled back entirely if any record "
                                    + "in it fails. When false, successful records are kept.");

    private SalesforceSinkOptions() {}
}
