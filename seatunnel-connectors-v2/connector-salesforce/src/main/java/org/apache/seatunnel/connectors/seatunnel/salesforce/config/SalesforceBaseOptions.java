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

/** Connection options shared by the Salesforce source and sink. */
public class SalesforceBaseOptions {

    public static final Option<String> URL =
            Options.key("url")
                    .stringType()
                    .defaultValue("https://login.salesforce.com")
                    .withDescription(
                            "The Salesforce OAuth login endpoint, e.g. "
                                    + "https://login.salesforce.com (production) or "
                                    + "https://test.salesforce.com (sandbox).");

    public static final Option<String> CLIENT_ID =
            Options.key("client_id")
                    .stringType()
                    .noDefaultValue()
                    .withDescription("The consumer key of the Salesforce connected app.");

    public static final Option<String> CLIENT_SECRET =
            Options.key("client_secret")
                    .stringType()
                    .noDefaultValue()
                    .withDescription("The consumer secret of the Salesforce connected app.");

    public static final Option<String> USERNAME =
            Options.key("username")
                    .stringType()
                    .noDefaultValue()
                    .withDescription("The Salesforce username used for the password OAuth flow.");

    public static final Option<String> PASSWORD =
            Options.key("password")
                    .stringType()
                    .noDefaultValue()
                    .withDescription("The Salesforce password used for the password OAuth flow.");

    public static final Option<String> SECURITY_TOKEN =
            Options.key("security_token")
                    .stringType()
                    .defaultValue("")
                    .withDescription(
                            "The Salesforce security token, appended to the password when the "
                                    + "request originates from an untrusted network.");

    public static final Option<String> API_VERSION =
            Options.key("version")
                    .stringType()
                    .defaultValue("59.0")
                    .withDescription("The Salesforce REST API version, e.g. 59.0.");

    public static final Option<Integer> CONNECT_TIMEOUT_MS =
            Options.key("connect_timeout_ms")
                    .intType()
                    .defaultValue(30000)
                    .withDescription("HTTP connect timeout in milliseconds.");

    public static final Option<Integer> READ_TIMEOUT_MS =
            Options.key("read_timeout_ms")
                    .intType()
                    .defaultValue(60000)
                    .withDescription("HTTP read timeout in milliseconds.");

    private SalesforceBaseOptions() {}
}
