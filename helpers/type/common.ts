import { ContractType } from "../constant/common";

export interface AddContractDTO {
  type: ContractType;
  address: string;
  version: number;
  description: string;
  apiKey: string;
}
