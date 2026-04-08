import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Reading {
    status: string;
    level: number;
    timestamp: bigint;
}
export interface Config {
    alertsEnabled: boolean;
    alertThreshold: number;
    apiEndpoint: string;
    deviceName: string;
    location: string;
}
export interface backendInterface {
    addReading(level: number, status: string): Promise<void>;
    fetchWaterLevel(endpoint: string): Promise<number>;
    getConfig(): Promise<Config>;
    getReadings(): Promise<Array<Reading>>;
    updateConfig(newConfig: Config): Promise<void>;
}
