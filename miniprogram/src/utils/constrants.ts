export const API = () => {
  return "https://gkdapp-api.jcygo.com/api/";
};
export const SCHOOL_TYPE = "school";

export const AUTOCANCELTIME = 15 * 60 * 1000;
export interface SchoolAddressOptions {
  area: string;
  areaId: number;
  build: string;
  buildId: number;
  detail: string;
}

// 发布的地址Interface
export interface PublishAddressInterface {
  noneText?: string; // 无地址展示的内容
  schoolNo?: string;
  contactName?: string;
  mobileNumber?: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  latitude?: string;
  longitude?: string;
  schoolBuild?: SchoolAddressOptions;
}

export type StatusType =
  | "all"
  | "waitPay"
  | "waitTake"
  | "waitSuccess"
  | "complete";
export type OrderTypeType = "user" | "taker";
