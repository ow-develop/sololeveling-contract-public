import { ethers } from "ethers";

export const getInterfaceId = (contractInterface: ethers.utils.Interface) => {
  const functions: string[] = Object.keys(contractInterface.functions);
  let interfaceId: ethers.BigNumber = ethers.constants.Zero;

  for (let i = 0; i < functions.length; i++) {
    interfaceId = interfaceId.xor(contractInterface.getSighash(functions[i]));
  }

  return interfaceId;
};
