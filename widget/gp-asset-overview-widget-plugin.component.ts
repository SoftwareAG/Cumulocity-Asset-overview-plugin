import { Component, ElementRef, Input, OnInit, ViewChild, isDevMode } from '@angular/core';
import { GpAssetOverviewWidgetService } from './gp-asset-overview-widget-plugin.service';
import { Observable, from, Subject, Subscription, BehaviorSubject, combineLatest } from "rxjs";
import { IManagedObject, InventoryService } from '@c8y/client';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as ImageData from './gp-default-image';
import { Router } from '@angular/router';

export interface Node {
  id: number;
  visible: boolean;
  children: Node[];
}
export interface DeviceData {
  id?: string;
  name?: string;
  lastUpdated?: Date;
  firmwareStatus?: string;
  c8y_AvailabilityStatus?: string;
  alertDetails?: any;
  other?: any;
  type?: any;
  c8y_FirmwareName?: string;
  c8y_FirmwareVersion?: string;
  c8y_FirmwareVersionIssues?: string;
  c8y_FirmwareVersionIssuesName?: string;
  c8y_RequiredAvailabilityResponseInterval?: string;
  c8y_ConnectionStatus?: string;
  c8y_CommunicationMode?: string;
  c8y_HardwareModel?: string;
  creationTime?: string;
  owner?: string;
  childDeviceAvailable?: any;
  c8y_Notes?: any;
  assetImage?: any;
  externalId?: string;
  externalType?: string;
}

@Component({
  selector: 'gp-asset-overview-widget-plugin',
  templateUrl: 'gp-asset-overview-widget-plugin.html',
  styleUrls: ['gp-asset-overview-widget-plugin.component.css'],
  imports: [],
})
export class GPAssetOverviewWidgetPluginComponent implements OnInit {
  selectedInputs: any[] = []; // Assuming your selected inputs are stored in this array
  selectedInputLabels: string[] = []; // Assuming corresponding labels are stored here
  groupedInputs: any[][] = [];
  groupedLabels: string[][] = [];

  configDashboardList = [];
  appId = '';
  @Input() config;
  configDevice = '';
  latestFirmwareVersion = 0;
  isBusy = false;
  otherProp: any;
  matData: any = [];
  //depth = '0';
  private _transformer = (node: Node, level: number) => {
    return {
      expandable: !!node.children && node.children.length > 0,
      level: level,
    };
  };

  dataSource: any;
  dynamicDisplayColumns = [];
  displayedColumnsForList: string[] = [];
  markerIcon = '';
  constructor(
    private deviceList: GpAssetOverviewWidgetService, private inventoryService: InventoryService, private sanitizer: DomSanitizer, private router: Router) {
  }
  async ngOnInit() {
    
    this.appId = await this.deviceList.getAppId();console.log("appid:",this.appId);
    if (!this.config.device) {
      this.config.device = {};
    }
    else {
      this.configDevice = this.config.device.id;
      let inventory = await this.inventoryService.detail(this.configDevice);
      if (inventory.data.hasOwnProperty('c8y_IsDevice')) {
        this.dataSource = [];
        this.dataSource.push(inventory.data);
      }
      if (this.appId) {
        this.isBusy = true;
        await this.getAllDevices(this.configDevice);
      } else {
        this.isBusy = true;
        await this.getAllDevices(this.configDevice);
      }
      if (!inventory.data.hasOwnProperty('c8y_IsDevice')) {
        this.dataSource = [{
          name: this.config.device.name,
          children: this.config.childDevices,
          visible: true,
          isRoot: true
        }];
      } else {
        this.dataSource.children = this.config.childDevices;
        this.dataSource.visible = true;
        this.dataSource.isRoot = true;
      }
    }
    if (this.config.markerIcon !== null && this.config.markerIcon !== undefined) {
      this.markerIcon = this.config.markerIcon;
    }
    this.otherProp = this.config.otherProp ? this.config.otherProp : '';
    this.displayedColumnsForList = this.config.selectedInputs ? this.config.selectedInputs : ['id', 'name', 'deviceExternalDetails.externalId', 'lastUpdated', 'c8y_Availability.status', 'c8y_ActiveAlarmsStatus'];
    if (this.config.otherPropList && this.config.otherPropList.length > 0) {
      this.config.otherPropList.forEach((element) => {
        if (element.label !== '' && element.value !== '') {
          this.dynamicDisplayColumns.push(element);
          this.displayedColumnsForList = this.displayedColumnsForList.concat([element.value]);
        }
      })
    }
    let index = this.displayedColumnsForList.indexOf('other');
    if (index !== -1) {
      this.displayedColumnsForList.splice(index, 1);
    }
    this.configDashboardList = this.config.dashboardList;

    // Assuming you have some logic to populate selectedInputs and selectedInputLabels arrays

    // Split selectedInputs and selectedInputLabels into groups of five
    this.groupedInputs = this.chunkArray(this.selectedInputs, 5);
    this.groupedLabels = this.chunkArray(this.selectedInputLabels, 5);
  }

  // Function to split array into chunks
  chunkArray(array: any[], chunkSize: number): any[][] {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunkedArray.push(array.slice(i, i + chunkSize));
    }
    return chunkedArray;
  }

  // Navigate URL to dashboard if dashboard is exist
  navigateURL(deviceId: string, deviceType: string) {console.log("navigator clicked id:"+deviceId+" type:"+deviceType);
    if (deviceType && this.appId) {
    // if (deviceType) {
      const dashboardObj = this.configDashboardList.find((dashboard) => dashboard.type === deviceType);
      if (dashboardObj && dashboardObj.templateID) {
        if (dashboardObj.withTabGroup) {
          this.router.navigate([
            `/application/${this.appId}/tabgroup/${deviceId}/dashboard/${dashboardObj.templateID}/device/${deviceId}`]);
        } else if (dashboardObj.tabGroupID) {
          this.router.navigate([
            `/application/${this.appId}/tabgroup/${dashboardObj.tabGroupID}/dashboard/${dashboardObj.templateID}/device/${deviceId}`]);
        } else {console.log("App id:",this.appId);
          this.router.navigate([`/application/${this.appId}/dashboard/${dashboardObj.templateID}/device/${deviceId}`]);
        }
      }
    } else if (deviceType) {
      this.router.navigate([`/device/${deviceId}`]);
    }
  }

  /**
     * Get All devices's device type
     */
  async getAllDevices(deviceId: string) {
    const deviceList: any = null;
    await this.deviceList.getChildDevices(deviceId, 1, deviceList)
      .then(async (deviceFound) => {
        this.config.childDevices = {};
        this.config.childDevices = await this.convertToTree(deviceFound.data);
        this.isBusy = false;
      })
      .catch((err) => {
        if (isDevMode()) { console.log('+-+- ERROR while getting ALL devices ', err); }
      });
  }


  async convertToTree(assets: any): Promise<Node[]> {
    const map = new Map<number, Node>();
    const roots: Node[] = [];

    for (const asset of assets) {
      map.set(asset.id, { ...asset, children: [] });
    }

    for (const asset of assets) {
      const parent = map.get(asset.id);
      if (asset.childAssets.references.length > 0) {
        for (const child of asset.childAssets.references) {
          let childNode: any = await this.getDeviceDetails(child.managedObject.id);
          //const childNode = map.get(child.managedObject.id);
          if (childNode) {
            parent?.children.push(childNode);
            parent.visible = true;
          }
        }
      }
      if (parent) {
        roots.push(map.get(asset.id)!);
      }
    }

    return roots;
  }
  async getDeviceDetails(managedObjectId) {
    let deviceFound = await this.inventoryService.detail(managedObjectId);
    return deviceFound.data;
  }
  expandAsset(devices) {
    if (devices.children && devices.children.length > 0) {
      devices.visible = !devices.visible;
    }
  }

  async loadAssetImage(image): Promise<SafeResourceUrl> {
    if (!image && !this.markerIcon) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('data:image/png;base64,' + ImageData.defaultImage);
    }

    // if content of image variable is a number it is assumed it is a binary id
    // and therefore the corresponding image is loaded from the binary repository
    if (image && Number(image)) {
      const response = await this.deviceList.downloadBinary(image) as Response;
      const binaryBlob = await response.blob();
      return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(binaryBlob));
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl('data:image/png;base64,' + image);
  }


  async loadAssetData(asset: any) {
    this.matData = [];
    let deviceData = await this.mapAssetData(asset);
    this.matData.push(deviceData);
    if (asset.children && asset.children.length > 0) {
      await this.loadChildAssets(asset.children);
    }
    console.log(this.matData);
  }

  async mapAssetData(asset) {
    let deviceData: DeviceData = {};
    let alertDesc = {
      minor: 0,
      major: 0,
      critical: 0,
      warning: 0
    };
    deviceData.id = asset.id;
    deviceData.name = asset.name;
    deviceData.type = asset.type;
    deviceData.lastUpdated = asset.lastUpdated;
    deviceData.creationTime = asset.creationTime;
    deviceData.externalId = asset.deviceExternalDetails ? asset.deviceExternalDetails.externalId : '';
    deviceData.externalType = asset.deviceExternalDetails ? asset.deviceExternalDetails.externalType : '';
    deviceData.owner = asset.owner ? asset.owner : 'Not available';
    deviceData.c8y_ConnectionStatus = asset.c8y_Connection ? asset.c8y_Connection.status : undefined;
    let availability = asset.c8y_Availability ? asset.c8y_Availability.status : undefined;
    alertDesc = (asset.hasOwnProperty('c8y_IsAsset')) ? await this.deviceList.getAlarmsForAsset(asset) : this.checkAlarm(asset, alertDesc);
    deviceData.assetImage = '';
    deviceData.c8y_RequiredAvailabilityResponseInterval = asset.c8y_RequiredAvailability ? asset.c8y_RequiredAvailability.responseInterval : '';
    deviceData.c8y_Notes = asset.c8y_Notes ? asset.c8y_Notes : '';
    deviceData.c8y_CommunicationMode = asset.c8y_CommunicationMode ? asset.c8y_CommunicationMode.mode : '';
    deviceData.c8y_HardwareModel = asset.c8y_Hardware ? asset.c8y_Hardware.model : '';
    if (asset.image) {
      deviceData.assetImage = await this.loadAssetImage(asset.image);
    }
    if (this.config.selectedInputs) {
      this.config.selectedInputs.forEach(element => {
        if (element === 'c8y_FirmwareVersion') {
          deviceData.c8y_FirmwareVersion = (asset.c8y_Firmware && asset.c8y_Firmware.version) ? this.getFirmwareRiskForFilter(asset.c8y_Firmware.version) : 'Not available';
        } else {
          deviceData.c8y_FirmwareVersion = 'Not available';
        }
        if (element === 'c8y_FirmwareName') {
          deviceData.c8y_FirmwareName = (asset.c8y_Firmware && asset.c8y_Firmware.name) ? asset.c8y_Firmware.name : 'Not available';
        } else {
          deviceData.c8y_FirmwareName = 'Not available';
        }
        if (element === 'c8y_FirmwareVersionIssues') {
          deviceData.c8y_FirmwareVersionIssues = (asset.c8y_Firmware && asset.c8y_Firmware.versionIssues) ? asset.c8y_Firmware.versionIssues : 'Not available';
        } else {
          deviceData.c8y_FirmwareVersionIssues = 'Not available';
        }
        if (element === 'c8y_FirmwareVersionIssuesName') {
          deviceData.c8y_FirmwareVersionIssuesName = (asset.c8y_Firmware && asset.c8y_Firmware.versionIssuesName) ? asset.c8y_Firmware.versionIssuesName : 'Not available';
        } else {
          deviceData.c8y_FirmwareVersionIssuesName = 'Not available';
        }
        if (element === 'c8y_AvailabilityStatus') {
          deviceData.c8y_AvailabilityStatus = availability;
        }
        if (element === 'ActiveAlarmsStatus') {
          deviceData.alertDetails = alertDesc;
        }
        if (element === 'c8y_ActiveAlarmsStatus') {
          deviceData.alertDetails = alertDesc;
        }
        if (element === 'Other' && this.getTheValue(asset, this.otherProp.value) !== undefined) {
          deviceData.other = this.getTheValue(asset, this.otherProp.value);
          deviceData.other = JSON.stringify(deviceData.other);
        }

        if (element === 'other' && this.getTheValue(asset, this.otherProp.value) !== undefined) {
          deviceData.other = this.getTheValue(asset, this.otherProp.value);
          deviceData.other = JSON.stringify(deviceData.other);
        }
      });
    }
    this.dynamicDisplayColumns.forEach(element => {
      deviceData[element.value] = this.getTheValue(asset, element.value);
      deviceData[element.value] = JSON.stringify(this.getTheValue(asset, element.value));
    });
    return deviceData;
  }

  loadChildAssets(childAssets) {
    childAssets.forEach(async (data) => {
      let deviceData = await this.mapAssetData(data);
      this.matData.push(deviceData);
    })
  }


  toDotNotation(obj, res = {}, current = '') {
    for (const key in obj) {
      let value = obj[key];
      let newKey = (current ? current + "." + key : key);  // joined key with dot
      if (value && typeof value === "object") {
        this.toDotNotation(value, res, newKey);  // it's a nested object, so do it again
      } else {
        res[newKey] = value;  // it's not an object, so set the property
      }
    }
    return res;
  }


  isAlerts(alarm) {
    if (alarm === undefined) { return false; }

    return (alarm.critical && alarm.critical > 0) || (alarm.major && alarm.major > 0)
      || (alarm.minor && alarm.minor > 0)
      || (alarm.warning && alarm.warning > 0);
  }
  isAlertsColor(alarm) {
    if (alarm) {
      if (alarm.critical && alarm.critical > 0) {
        return 'criticalAlerts2';
      } else if (alarm.major && alarm.major > 0) {
        return 'majorAlerts2';
      } else if (alarm.minor && alarm.minor > 0) {
        return 'minorAlerts2';
      } else if (alarm.warning && alarm.warning > 0) {
        return 'warningAlerts2';
      } else {
        return '';
      }
    }
    return '';
  }

  isAlertsBGColor(alarm) {
    if (alarm) {
      if (alarm.critical && alarm.critical > 0) {
        return 'criticalAlerts';
      } else if (alarm.major && alarm.major > 0) {
        return 'majorAlerts';
      } else if (alarm.minor && alarm.minor > 0) {
        return 'minorAlerts';
      } else if (alarm.warning && alarm.warning > 0) {
        return 'warningAlerts';
      } else {
        return '';
      }
    }
    return '';
  }

  getTotalAlerts(alarm) {
    let alertCount = 0;
    if (alarm) {
      if (alarm.critical && alarm.critical > 0) {
        alertCount += alarm.critical;
      }
      if (alarm.major && alarm.major > 0) {
        alertCount += alarm.major;
      }
      if (alarm.minor && alarm.minor > 0) {
        alertCount += alarm.minor;
      }
      if (alarm.warning && alarm.warning > 0) {
        alertCount += alarm.warning;
      }
    }
    return alertCount;
  }
  isAlertCritical(alarm) {
    return (alarm && alarm.critical && alarm.critical > 0);
  }
  isAlertMajor(alarm) {
    return (alarm && alarm.major && alarm.major > 0);
  }
  isAlertMinor(alarm) {
    return (alarm && alarm.minor && alarm.minor > 0);
  }
  isAlertWarning(alarm) {
    return (alarm && alarm.warning && alarm.warning > 0);
  }


  loadText(alarm) {
    let alarmsStatus = '';
    if (alarm) {
      if (alarm.critical && alarm.critical > 0) {
        alarmsStatus = alarmsStatus + `Critical: ${alarm.critical} `;
      }
      if (alarm.major && alarm.major > 0) {
        alarmsStatus = alarmsStatus + `Major: ${alarm.major} `;
      }
      if (alarm.minor && alarm.minor > 0) {
        alarmsStatus = alarmsStatus + `Minor: ${alarm.minor} `;
      }
      if (alarm.warning && alarm.warning > 0) {
        alarmsStatus = alarmsStatus + `Warning: ${alarm.warning} `;
      }
    }
    return alarmsStatus;
  }
  getTheValue(device, value: string) {
    if (typeof value === 'string' && value.includes('.')) {
      const arr = value.split('.');
      let actualValue = device[arr[0]] ? device[arr[0]] : undefined;
      if (actualValue !== undefined) {
        for (let i = 1; i < arr.length; i++) {
          actualValue = actualValue[arr[i]];
        }
      }
      return actualValue;
    }
    return device[value];
  }
  getFirmwareRiskForFilter(version) {
    const versionIssue = this.calculateFirmwareRisk(version);
    if (versionIssue === -1) {
      return 'Low  Risk';
    } else if (versionIssue === -2) {
      return 'Medium Risk';
    } else if (versionIssue === -3) {
      return 'High Risk';
    } else {
      return 'No Risk';
    }
  }
  calculateFirmwareRisk(version) {
    let versionIssues = 0;
    versionIssues = version - this.latestFirmwareVersion;
    return versionIssues;
  }
  async getFirmwareData() {
    const firmwareData = await this.inventoryService.list({ type: 'sag_racm_currentFirmware' });
    if (firmwareData.data.length > 0) {
      this.latestFirmwareVersion = firmwareData.data[0].firmware.version;
    }
  }
  checkAlarm(inventory: IManagedObject, alertDesc: any): any {
    if (inventory.c8y_ActiveAlarmsStatus) {
      if (inventory.c8y_ActiveAlarmsStatus.hasOwnProperty('minor')) {
        if (inventory.c8y_ActiveAlarmsStatus.minor > 0) {
          alertDesc.minor += inventory.c8y_ActiveAlarmsStatus.minor;
        }
      }
      if (inventory.c8y_ActiveAlarmsStatus.hasOwnProperty('major')) {
        if (inventory.c8y_ActiveAlarmsStatus.major > 0) {
          alertDesc.major += inventory.c8y_ActiveAlarmsStatus.major;
        }
      }
      if (inventory.c8y_ActiveAlarmsStatus.hasOwnProperty('critical')) {
        if (inventory.c8y_ActiveAlarmsStatus.critical > 0) {
          alertDesc.critical += inventory.c8y_ActiveAlarmsStatus.critical;
        }
      }
      if (inventory.c8y_ActiveAlarmsStatus.hasOwnProperty('warning')) {
        if (inventory.c8y_ActiveAlarmsStatus.warning > 0) {
          alertDesc.warning += inventory.c8y_ActiveAlarmsStatus.warning;
        }
      }
    }
    return alertDesc;
  }
}