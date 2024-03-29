/**
 * Copyright (c) 2024 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BootstrapComponent, CoreModule, RouterModule } from '@c8y/ngx-components';
import { RouterModule as ngRouterModule } from '@angular/router';
import { CockpitDashboardModule } from '@c8y/ngx-components/context-dashboard';
import { GpAssetOverviewWidgetPluginModule } from './widget/gp-asset-overview-widget-plugin.module';
import { BsModalRef } from 'ngx-bootstrap/modal';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    RouterModule.forRoot([]),
    ngRouterModule.forRoot([], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    CockpitDashboardModule,
    RouterModule.forRoot(),
    GpAssetOverviewWidgetPluginModule
  ],
  providers: [BsModalRef],
  bootstrap: [BootstrapComponent]
})
export class AppModule {}
