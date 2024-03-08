import * as dotenv from "dotenv";
import { BigNumber, providers, Wallet } from "ethers";
import {
  addDefaultLocalNetwork,
  Erc20Bridger,
  getL2Network,
  L1ToL2MessageStatus,
} from "@arbitrum/sdk";
import { ethers, expect } from "hardhat";

dotenv.config();

async function main() {
  const privateKey = process.env.ETHER_PRIVATE_KEY_1 || "";
  const l1Provider = new providers.JsonRpcProvider(
    "https://goerli.infura.io/v3/0f0594731ab14200bc3e2dafdaa56d4a"
  );
  const l2Provider = new providers.JsonRpcProvider(
    "https://arbitrum-goerli.infura.io/v3/0f0594731ab14200bc3e2dafdaa56d4a"
  );
  const l1Wallet = new Wallet(privateKey, l1Provider);
  const l2Wallet = new Wallet(privateKey, l2Provider);

  const tokenAmount = BigNumber.from(100);

  const L1Token = (await ethers.getContractFactory("TestUSDC")).connect(
    l1Wallet
  );
  const l1Token = new ethers.Contract(
    "0x3F5b92d57f45aD10428C7ce484293F594d8F474c",
    L1Token.interface,
    l1Wallet
  );

  addDefaultLocalNetwork();

  const l2Network = await getL2Network(l2Provider);
  const erc20Bridger = new Erc20Bridger(l2Network);

  const l1ERC20Address = l1Token.address;
  const expectedL1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    l1ERC20Address,
    l1Provider
  );
  const initialBridgeTokenBalance = await l1Token.balanceOf(
    expectedL1GatewayAddress
  );

  // const withdrawTx = await erc20Bridger.withdraw({
  //   amount: tokenAmount,
  //   destinationAddress: l2Wallet.address,
  //   erc20l1Address: l1Token.address,
  //   l2Signer: l2Wallet,
  // });
  // const withdrawRec = await withdrawTx.wait();
  // console.log(`Token withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`);

  // console.log("Approving:");
  // const approveTx = await erc20Bridger.approveToken({
  //   l1Signer: l1Wallet,
  //   erc20L1Address: l1ERC20Address,
  // });
  // const approveRec = await approveTx.wait();
  // console.log(
  //   `You successfully allowed the Arbitrum Bridge to spend Token ${approveRec.transactionHash}`
  // );

  console.log("Transferring Token to L2:");
  const depositTx = await erc20Bridger.deposit({
    amount: tokenAmount,
    erc20L1Address: l1ERC20Address,
    l1Signer: l1Wallet,
    l2Provider: l2Provider,
  });

  console.log(
    `Deposit initiated: waiting for L2 retryable (takes 10-15 minutes; current time: ${new Date().toTimeString()}) `
  );
  const depositRec = await depositTx.wait();
  const l2Result = await depositRec.waitForL2(l2Provider);

  l2Result.complete
    ? console.log(
        `L2 message successful: status: ${L1ToL2MessageStatus[l2Result.status]}`
      )
    : console.log(
        `L2 message failed: status ${L1ToL2MessageStatus[l2Result.status]}`
      );

  const finalBridgeTokenBalance = await l1Token.balanceOf(
    expectedL1GatewayAddress
  );

  expect(finalBridgeTokenBalance).to.equal(
    tokenAmount.add(initialBridgeTokenBalance)
  );

  const l2TokenAddress = await erc20Bridger.getL2ERC20Address(
    l1ERC20Address,
    l1Provider
  );
  const l2Token = erc20Bridger.getL2TokenContract(l2Provider, l2TokenAddress);
  const l2Balance = (await l2Token.functions.balanceOf(l2Wallet.address))[0];

  expect(l2Balance).to.equal(tokenAmount);

  console.log(`L2 token balance : ${l2Balance}`);
  console.log(`L2 token address : ${l2TokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
