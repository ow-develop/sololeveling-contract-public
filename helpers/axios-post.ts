import axios from "axios";

import { API_URL, ContractType } from "./constant/common";

export const addContractDB = async (
  type: ContractType,
  address: string,
  version: number,
  description: string
): Promise<string> => {
  const apiKey = process.env.OW_CONTRACT_API_KEY
    ? process.env.OW_CONTRACT_API_KEY
    : "";

  const success = await axiosPost({
    type,
    address,
    version,
    description,
    apiKey,
  });

  return success ? `🟢 ${type} Added at DB` : `🔴 Failed! ${type} Add at DB`;
};

export const deployDBSetting = async () => {
  const secretKey = process.env.CONTRACT_DEPLOY_SECRET_KEY
    ? process.env.CONTRACT_DEPLOY_SECRET_KEY
    : "";

  const success = await axiosPost({
    secretKey,
  });

  return success ? "🟢 Success! DB Update" : "🔴 Failed! DB Update";
};

const axiosPost = async (body: object): Promise<boolean> => {
  try {
    await axios.post(API_URL, body);
  } catch (error) {
    return false;
  }

  return true;
};
