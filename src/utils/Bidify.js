/* eslint-disable */

/**
 * Bidify js methods
 * @module Bidify
 * @example
 * const Bidify = require('~/plugins/bidify.js')
 *
 * Bidify.bid(...)
 */

import Web3 from "web3";
import { Contract, ethers } from "ethers";
import { FetchWrapper } from "use-nft";
import {
  BIDIFY,
  BIT,
  ERC721,
  ERC1155,
  URLS,
  getLogUrl,
  snowApi,
  baseUrl,
  NetworkId,
  NetworkData,
} from "./config";
import axios from "axios";

const chainId = Promise.resolve(
  new Web3(window.ethereum).eth.getChainId((res) => {
    return res;
  })
);

async function getBidify() {
  const chainID = await web3.eth.getChainId();
  return new web3.eth.Contract(BIDIFY.abi, BIDIFY.address[chainID]);
}

const web3 = new Web3(window.ethereum);
let from = window?.ethereum?.selectedAddress;

// Convert to a usable value
export function atomic(value, decimals) {
  let quantity = decimals;
  if (value.indexOf(".") !== -1) {
    quantity -= value.length - value.indexOf(".") - 1;
  }
  let atomicized = value.replace(".", "");
  for (let i = 0; i < quantity; i++) {
    atomicized += "0";
  }
  while (atomicized[0] === "0") {
    atomicized = atomicized.substr(1);
  }
  return Web3.utils.toBN(atomicized);
}

// Convert to a human readable value
export function unatomic(value, decimals) {
  value = value.padStart(decimals + 1, "0");
  let temp =
    value.substr(0, value.length - decimals) +
    "." +
    value.substr(value.length - decimals);
  while (temp[0] === "0") {
    temp = temp.substr(1);
  }
  while (temp.endsWith("0")) {
    temp = temp.slice(0, -1);
  }
  if (temp.endsWith(".")) {
    temp = temp.slice(0, -1);
  }
  if (temp.startsWith(".")) {
    temp = "0" + temp;
  }

  if (temp == "") {
    return "0";
  }
  return temp;
}

// Get the decimals of an ERC20
export async function getDecimals(currency) {
  const web3 = new Web3(window.ethereum);
  if (!currency) {
    return 18;
  }

  return await new web3.eth.Contract(BIT.abi, currency).methods
    .decimals()
    .call();
}

// Get how many decimals Bidify uses with an ERC20
async function getDecimalAccuracy(currency) {
  return Math.min(await getDecimals(currency), 4);
}

// Get the minimum price Bidify will use in relation to an ERC20
export async function getMinimumPrice(currency) {
  const Bidify = await getBidify();
  let decimals = await getDecimals(currency);
  if (!currency) {
    currency = "0x0000000000000000000000000000000000000000";
  }
  return unatomic(
    new web3.utils.BN(await Bidify.methods.getPriceUnit(currency).call())
      .mul(new web3.utils.BN(20))
      .toString(),
    decimals
  );
}

/**
 * Get all NFTs for the current user as a list of [{ platform, token }]
 * Only works for accounts who have received <1000 NFTs (including repeats)
 * Chunk the getPastLogs call or limit to a specific NFT platform to avoid this
 * @name getNFTs
 * @method
 * @memberof Bidify
 */

export async function getNFTs(chainId, account) {
  const from = account;
  const web3 = new Web3(new Web3.providers.HttpProvider(URLS[chainId]));
  const topic = "0x" + from.split("0x")[1].padStart(64, "0");
  let logs = [];
  let logs_1155 = [];
  if (
    chainId === NetworkId.AVAX ||
    chainId === NetworkId.MATIC ||
    chainId === NetworkId.BNB ||
    chainId === 5 ||
    chainId === 9001 ||
    chainId === 1285 ||
    chainId === 100 ||
    chainId === NetworkId.INK
  ) {
    const ret = await axios
      .get(
        `${getLogUrl[chainId]}&fromBlock=0&${
          chainId === NetworkId.INK ? "toBlock=latest&" : ""
        }topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&topic0_2_opr=and&topic2=${topic}&apikey=${
          snowApi[chainId]
        }`
      )
      .catch((e) => console.log("getNft error"));
    logs = ret.data.result;
  } else
    logs = await web3.eth
      .getPastLogs({
        fromBlock: 0,
        toBlock: "latest",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          null,
          "0x" + from.split("0x")[1].padStart(64, "0"),
        ],
      })
      .catch((e) => {
        console.log("error on getpastlogs", e.message);
      });
  // Filter to just tokens which are still in our custody
  const res = [];
  const ids = {};
  for (let log of logs) {
    if (log.topics[3] !== undefined) {
      try {
        let platform = log.address;
        let token = log.topics[3];
        let owner = await new web3.eth.Contract(ERC721.abi, platform).methods
          .ownerOf(token)
          .call();
        if (owner.toLowerCase() !== from.toLowerCase()) {
          continue;
        }
        let jointID = platform + token;
        if (ids[jointID]) {
          continue;
        }
        token = parseInt(token, 16).toString();
        ids[jointID] = true;
        res.push({ platform, token, amount: 1 });
      } catch (e) {
        console.log(e);
        continue;
      }
    } else {
      continue;
    }
  }
  if (
    chainId === NetworkId.AVAX ||
    chainId === NetworkId.MATIC ||
    chainId === NetworkId.BNB ||
    chainId === 5 ||
    chainId === 9001 ||
    chainId === 1285 ||
    chainId === 100 ||
    chainId === NetworkId.INK
  ) {
    const ret = await axios.get(
      `${getLogUrl[chainId]}&fromBlock=0&${
        chainId === 9001 ||
        chainId === 100 ||
        chainId === 61 ||
        chainId === NetworkId.INK
          ? "toBlock=latest&"
          : ""
      }topic0=0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62&topic0_3_opr=and&topic3=${
        chainId === 9001 || chainId === 100 ? topic.toLowerCase() : topic
      }&apikey=${snowApi[chainId]}`
    );
    logs_1155 = ret.data.result;
  } else
    logs_1155 = await web3.eth.getPastLogs({
      fromBlock: 0,
      toBlock: "latest",
      topics: [
        "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
        null,
        null,
        "0x" + from.split("0x")[1].padStart(64, "0"),
      ],
    });
  for (let log of logs_1155) {
    if (log.topics[3] !== undefined) {
      try {
        let platform = log.address;
        const decodeData = web3.eth.abi.decodeParameters(
          ["uint256", "uint256"],
          log.data
        );
        let token = web3.utils.toHex(decodeData[0]);
        let amount = await new web3.eth.Contract(ERC1155.abi, platform).methods
          .balanceOf(from, decodeData[0])
          .call();
        if (amount < 1) continue;

        let jointID = platform + token;

        if (ids[jointID]) {
          continue;
        }
        token = token.toString();
        ids[jointID] = true;
        res.push({ platform, token, amount });
      } catch (e) {
        continue;
      }
    } else {
      continue;
    }
  }
  return res;
}

/**
 * Wallet signature for approval for Bidify contract
 * @name signList
 * @method
 * @param {string} currency to utilize
 * @param {string} platform to list
 * @param {string} token to list
 * @param {string} price to list at (minimum starting price)
 * @param {string} days to list for
 * @param {boolean} allowMarketplace
 * @memberof Bidify
 */

export async function signList({
  platform,
  token,
  isERC721,
  chainId,
  account,
  library,
}) {
  const erc721 = new ethers.Contract(platform, ERC721.abi, library.getSigner());
  const erc1155 = new ethers.Contract(
    platform,
    ERC1155.abi,
    library.getSigner()
  );
  let tx;
  const gasLimit = 1000000;

  if (!isERC721) {
    const isApproved = await erc1155.isApprovedForAll(
      account,
      BIDIFY.address[chainId]
    );
    if (!isApproved) {
      tx =
        chainId === NetworkId.MATIC
          ? await erc1155.setApprovalForAll(BIDIFY.address[chainId], true, {
              gasLimit,
            })
          : await erc1155.setApprovalForAll(BIDIFY.address[chainId], true);
    }
  }
  if (isERC721) {
    tx =
      chainId === NetworkId.MATIC
        ? await erc721.approve(BIDIFY.address[chainId], token, { gasLimit })
        : await erc721.approve(BIDIFY.address[chainId], token);
  }
  if (tx) {
    await tx.wait();
  }
}

/**
 * Lists an ERC721 token with Bidify
 * @name list
 * @method
 * @param {string} currency to utilize
 * @param {string} platform to list
 * @param {string} token to list
 * @param {string} price to list at (minimum starting price)
 * @param {string} days to list for
 * @param {boolean} allowMarketplace
 * @memberof Bidify
 */

export async function list({
  currency,
  platform,
  token,
  price,
  endingPrice,
  days,
  image,
  name,
  description,
  metadataUrl,
  chainId,
  account,
  library,
  isERC721,
  setTransaction,
}) {
  let decimals = await getDecimals(currency);
  if (!currency) {
    currency = "0x0000000000000000000000000000000000000000";
  }
  const Bidify = new ethers.Contract(
    BIDIFY.address[chainId],
    BIDIFY.abi,
    library.getSigner()
  );
  const tokenNum = token;
  const gasLimit = 1000000;
  try {
    const totalCount = await getLogs(chainId);
    const tx =
      chainId === NetworkId.MATIC
        ? await Bidify.list(
            currency,
            platform,
            tokenNum.toString(),
            atomic(price.toString(), decimals).toString(),
            atomic(endingPrice.toString(), decimals).toString(),
            Number(days),
            isERC721,
            "0x0000000000000000000000000000000000000000",
            { gasLimit }
          )
        : await Bidify.list(
            currency,
            platform,
            tokenNum.toString(),
            atomic(price.toString(), decimals).toString(),
            atomic(endingPrice.toString(), decimals).toString(),
            Number(days),
            isERC721,
            "0x0000000000000000000000000000000000000000"
          );
    const ret = await tx.wait();
    console.log("transaction successed", ret);
    setTransaction(ret);
    while ((await getLogs(chainId)) === totalCount) {
      console.log("while loop");
    }
    const newId = totalCount;
    const listingDetail = await getDetailFromId(
      newId,
      chainId,
      account,
      image,
      metadataUrl,
      name,
      token,
      platform,
      isERC721,
      library
    );
    console.log("listingDetail", listingDetail);
    await axios.post(`${baseUrl}/auctions`, {
      ...listingDetail,
      image_cache: image,
    });
  } catch (error) {
    return console.log("list error", error);
  }
}

/**
 * Gets a listing from Bidify
 * @name getListing
 * @method
 * @param {string} id of listing
 * @memberof Bidify
 */

export async function getListing(id) {
  const chain_id = await chainId;
  const web3 = new Web3(new Web3.providers.HttpProvider(URLS[chain_id]));
  const Bidify = await getBidify();

  const nullIfZeroAddress = (value) => {
    if (value === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return value;
  };

  let raw = await Bidify.methods.getListing(id).call();
  let currency = nullIfZeroAddress(raw.currency);

  let highBidder = nullIfZeroAddress(raw.highBidder);
  let currentBid = raw.price;
  let nextBid = await Bidify.methods.getNextBid(id).call();
  let endingPrice = raw.endingPrice;
  let decimals = await getDecimals(currency);
  if (currentBid === nextBid) {
    currentBid = null;
  } else {
    currentBid = unatomic(currentBid, decimals);
  }

  let referrer = nullIfZeroAddress(raw.referrer);
  let marketplace = nullIfZeroAddress(raw.marketplace);

  let bids = [];
  for (let bid of await web3.eth.getPastLogs({
    fromBlock: 0,
    toBlock: "latest",
    address: BIDIFY.address[chain_id],
    topics: [
      "0x4c3c1c767fe4a41c6b19602745478b39af5f2a01becc2a37fb82291014d72770",
      "0x" + new web3.utils.BN(id).toString("hex").padStart(64, "0"),
    ],
  })) {
    bids.push({
      bidder: "0x" + bid.topics[2].substr(-40),
      price: unatomic(
        new web3.utils.BN(bid.data.substr(2), "hex").toString(),
        decimals
      ),
    });
  }

  return {
    id,
    creator: raw.creator,
    currency,
    platform: raw.platform,
    token: raw.token,

    highBidder,
    currentBid,
    nextBid: unatomic(nextBid, decimals),
    endingPrice: unatomic(endingPrice.toString(), decimals),

    referrer,
    allowMarketplace: raw.allowMarketplace,
    marketplace,

    endTime: raw.endTime,
    paidOut: raw.paidOut,
    isERC721: raw.isERC721,

    bids,
  };
}

/**
 * Signs the bid before calling contract
 * @name signBid
 * @method
 * @param {string} id of listing to bid on
 * @memberof Bidify
 */

export const signBid = async (id, amount, chainId, account, library) => {
  // return;
  const from = account;
  const chain_id = chainId;

  let currency;
  currency = (await getListingDetail(id, chainId, library)).currency;

  let balance;
  const web3 = new Web3(new Web3.providers.HttpProvider(URLS[chainId]));
  if (!currency) {
    balance = await web3.eth.getBalance(from);
    balance = web3.utils.fromWei(balance);
  } else {
    const erc20 = new ethers.Contract(currency, BIT.abi, library.getSigner());
    const decimals = await getDecimals(currency);
    balance = unatomic(await erc20.balanceOf(from), decimals);
    let allowance = await erc20.allowance(from, BIDIFY.address[chain_id]);
    if (Number(amount) >= Number(allowance)) {
      if (chainId === NetworkId.MATIC) {
        const gasLimit = 1000000;
        const tx = await erc20.approve(
          BIDIFY.address[chainId],
          atomic(balance, decimals),
          { gasLimit }
        );
        await tx.wait();
      } else {
        const tx = await erc20.approve(
          BIDIFY.address[chainId],
          atomic(balance, decimals)
        );
        await tx.wait();
      }
    }
  }

  if (Number(balance) < Number(amount)) {
    throw new Error("low_balance");
  }
};

/**
 * Bids on a listing via Bidify
 * @name bid
 * @method
 * @param {string} id of listing to bid on
 * @memberof Bidify
 */

export const bid = async (
  id,
  amount,
  chainId,
  account,
  library,
  setTransaction
) => {
  let currency;
  currency = (await getListingDetail(id, chainId, library)).currency;
  let decimals = await getDecimals(currency);
  const Bidify = new ethers.Contract(
    BIDIFY.address[chainId],
    BIDIFY.abi,
    library.getSigner()
  );
  const from = account;
  const gasLimit = 1000000;
  if (currency) {
    const tx =
      chainId === NetworkId.MATIC
        ? await Bidify.bid(
            id,
            "0x0000000000000000000000000000000000000000",
            atomic(amount, decimals).toString(),
            { gasLimit }
          )
        : await Bidify.bid(
            id,
            "0x0000000000000000000000000000000000000000",
            atomic(amount, decimals).toString()
          );
    const ret = await tx.wait();
    setTransaction(ret);
  } else {
    const tx =
      chainId === NetworkId.MATIC
        ? await Bidify.bid(
            id,
            "0x0000000000000000000000000000000000000000",
            atomic(amount, decimals).toString(),
            {
              from: from,
              value: atomic(amount, decimals).toString(),
              gasLimit,
            }
          )
        : await Bidify.bid(
            id,
            "0x0000000000000000000000000000000000000000",
            atomic(amount, decimals).toString(),
            {
              from: from,
              value: atomic(amount, decimals).toString(),
            }
          );
    const ret = await tx.wait();
    setTransaction(ret);
  }
};

/**
 * Gets all all recent listings from Bidify
 * @name getListings
 * @method
 * @param {string} creator
 * @param {string} platform
 * @memberof Bidify
 */

export async function getListings(creator, platform) {
  let creatorTopic = null;
  if (creator) {
    creatorTopic = "0x" + creator.substr(2).toLowerCase().padStart(64, "0");
  }

  let platformTopic = null;
  if (platform) {
    platformTopic = "0x" + platform.substr(2).toLowerCase().padStart(64, "0");
  }

  let res = [];
  for (let listing of await web3.eth.getPastLogs({
    fromBlock: 0,
    toBlock: "latest",
    address: settings.bidifyAddress,
    topics: [
      "0x5424fbee1c8f403254bd729bf71af07aa944120992dfa4f67cd0e7846ef7b8de",
      null,
      creatorTopic,
      platformTopic,
    ],
  })) {
    res.push(new web3.utils.BN(listing.topics[1].substr(2), "hex").toString());
  }
  return res;
}

/**
 * ...
 * @name finish
 * @method
 * @param {string} id of listing
 * @memberof Bidify
 */

export async function finish(id) {
  const Bidify = await getBidify();
  await Bidify.methods
    .finish(id)
    .send({ from: window?.ethereum?.selectedAddress });
}

/**
 * Gets eth balance of current connected account
 * @name getETHBalance
 * @method
 * @memberof Bidify
 */

export async function getETHBalance() {
  const Bidify = await getBidify();
  return unatomic((await Bidify.methods.balanceOf(from).call()) || "0", 18);
}

/**
 * ...
 * @name withdraw
 * @method
 * @memberof Bidify
 */

export async function withdraw() {
  const Bidify = await getBidify();
  await Bidify.methods.withdraw(from).send({ from });
}

/**
 * ...
 * @name mintNFT
 * @method
 * @memberof Bidify
 */
export async function mintNFT(token) {
  await new web3.eth.Contract(TestNFTJSON, settings.nftAddress).methods
    ._mint(token)
    .send({ from });

  return { token, address: settings.nftAddress };
}

const TestNFTJSON = [
  {
    inputs: [
      { internalType: "string", name: "name_", type: "string" },
      { internalType: "string", name: "symbol_", type: "string" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "baseURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "_mintActual",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "_mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const isValidUrl = (urlString) => {
  var urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // validate domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // validate port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // validate query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // validate fragment locator
  return !!urlPattern.test(urlString);
};

export const getBalance = async (account, chainId) => {
  const web3 = new Web3(new Web3.providers.HttpProvider(URLS[chainId]));
  let _balance = await web3.eth.getBalance(account); //Will give value in.
  _balance = web3.utils.fromWei(_balance);
  return _balance;
};

export const getFetchValues = async (val, chainId, account) => {
  let provider;
  if (!URLS[chainId]) {
    console.log("select valid chain");
  } else {
    provider = new ethers.providers.JsonRpcProvider(URLS[chainId]);
  }

  const ethersConfig = {
    ethers: { Contract },
    provider: provider,
  };

  const fetcher = ["ethers", ethersConfig];

  function ipfsUrl(cid, path = "") {
    return `https://dweb.link/ipfs/${cid}${path}`;
  }

  function imageurl(url) {
    // const string = url;
    const check = url.substr(16, 4);
    if (url.includes("ipfs://"))
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    if (url.includes("https://ipfs.io/ipfs/"))
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    if (url.includes("https://arweave.net")) return url;
    if (check === "ipfs") {
      const manipulated = url.substr(16, 16 + 45);
      return "https://dweb.link/" + manipulated;
    } else {
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
  }

  const fetchWrapper = new FetchWrapper(fetcher, {
    jsonProxy: (url) => {
      return url;
    },
    imageProxy: (url) => {
      if (
        chainId === NetworkId.MATIC ||
        chainId === NetworkId.AVAX ||
        chainId === 42161 ||
        chainId === NetworkId.BNB ||
        chainId === NetworkId.INK
      ) {
        return url;
      } else {
        return imageurl(url);
      }
    },
    ipfsUrl: (cid, path) => {
      return ipfsUrl(cid, path);
    },
  });
  let result = {};
  try {
    result = await fetchWrapper.fetchNft(val?.platform, val?.token);
    const finalResult = {
      ...result,
      platform: val?.platform,
      token: val?.token,
      isERC721: result.owner ? true : false,
      owner: result.owner ? result.owner : account,
      amount: val?.amount,
    };
    return finalResult;
  } catch (e) {
    const finalResult = {
      platform: val?.platform,
      token: val?.token,
      isERC721: result && result.owner ? true : false,
      owner: result && result.owner ? result.owner : account,
      amount: val?.amount,
    };
    return finalResult;
  }
};

export const getDetails = async (chainId, account) => {
  let getNft;

  let results = [];
  try {
    getNft = await getNFTs(chainId, account);
  } catch (e) {
    console.log(e.message);
  }
  for (var i = 0; i < getNft?.length; i++) {
    try {
      const res = await getFetchValues(getNft[i], chainId, account);
      results.push(res);
    } catch (error) {
      console.log(error);
    }
  }
  return results.map((item) => {
    return { ...item, network: chainId };
  });
};

export const getListingDetail = async (id, chainId, library) => {
  const bidify = new ethers.Contract(
    BIDIFY.address[chainId],
    BIDIFY.abi,
    library.getSigner()
  );
  let raw = await bidify.getListing(id.toString());
  while (raw.creator === "0x0000000000000000000000000000000000000000") {
    raw = await bidify.getListing(id.toString());
  }
  const nullIfZeroAddress = (value) => {
    if (value === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return value;
  };

  let currency = nullIfZeroAddress(raw.currency);

  let highBidder = nullIfZeroAddress(raw.highBidder);
  let currentBid = raw.price;
  let nextBid = await bidify.getNextBid(id);
  let endingPrice = raw.endingPrice;
  let decimals = await getDecimals(currency);
  if (currentBid === nextBid) {
    currentBid = null;
  } else {
    currentBid = unatomic(currentBid.toString(), decimals);
  }

  let referrer = nullIfZeroAddress(raw.referrer);
  let marketplace = nullIfZeroAddress(raw.marketplace);

  let bids = [];
  const web3 = new Web3(window.ethereum);
  const topic1 = "0x" + new web3.utils.BN(id).toString("hex").padStart(64, "0");
  const ret = await axios.get(
    `${
      getLogUrl[chainId]
    }&fromBlock=0&toBlock=latest&topic0=0x4c3c1c767fe4a41c6b19602745478b39af5f2a01becc2a37fb82291014d72770&topic0_1_opr=and&topic1=${
      chainId === 9001 ? topic1.toLowerCase() : topic1
    }&apikey=${snowApi[chainId]}`
  );
  const logs = ret.data.result;
  for (let bid of logs) {
    bids.push({
      bidder: "0x" + bid.topics[2].substr(-40),
      price: unatomic(
        parseInt(bid.data.substr(2, 64), 16).toString(),
        decimals
      ),
    });
  }
  return {
    id,
    creator: raw.creator,
    currency,
    platform: raw.platform,
    token: raw.token.toString(),

    highBidder,
    currentBid,
    nextBid: unatomic(nextBid.toString(), decimals),
    endingPrice: unatomic(endingPrice.toString(), decimals),

    referrer,
    allowMarketplace: raw.allowMarketplace,
    marketplace,

    endTime: raw.endTime.toString(),
    paidOut: raw.paidOut,
    isERC721: raw.isERC721,

    bids,
  };
};

export const getLogs = async (chainId) => {
  const web3 = new Web3(new Web3.providers.HttpProvider(URLS[chainId]));
  const topic0 =
    "0x5424fbee1c8f403254bd729bf71af07aa944120992dfa4f67cd0e7846ef7b8de";
  let logs = [];
  try {
    let url = `${getLogUrl[chainId]}&fromBlock=0&toBlock=latest&address=${BIDIFY.address[chainId]}&topic0=${topic0}`;
    if (chainId !== chainId.INK && chainId !== chainId.AVAX) {
      url += `&apikey=${snowApi[chainId]}`;
    }
    const ret = await axios.get(url);
    logs = ret.data.result;
  } catch (e) {
    console.log(e.message);
  }

  return logs.length;
};

export const getDetailFromId = async (
  id,
  chainId,
  account,
  image,
  metadataUrl,
  name,
  token,
  platform,
  isERC721,
  library
) => {
  let detail;
  detail = await getListingDetail(id, chainId, library);
  let fetchedValue;
  if (chainId !== NetworkId.INK)
    fetchedValue = await getNFTAsset(platform, token, chainId);
  else {
    fetchedValue = await getFetchValues(detail, chainId, account);
  }
  console.log(platform, token, chainId, fetchedValue);
  const { owner, description } = fetchedValue;
  return {
    owner,
    ...detail,
    network: chainId,
    image,
    metadataUrl,
    name,
    token,
    platform,
    isERC721,
    description,
  };
};

export const handleIpfsImageUrl = (displayImg) => {
  if (displayImg.includes("ipfs://")) {
    return displayImg.replace("ipfs://", "https://ipfs.io/ipfs/");
  } else {
    return displayImg;
  }
};

export const fetchNFTScan = async (address, chainId) => {
  const response = await axios.get(
    `${NetworkData[chainId].nftscan}/account/own/all/${address}?erc_type=&show_attribute=false&sort_field=&sort_direction=`,
    {
      headers: {
        "X-API-KEY": process.env.REACT_APP_NFT_KEY,
      },
    }
  );
  if (response.status === 200) {
    const assets_res = response.data.data.flatMap(
      (contract) => contract.assets
    );
    const assets = assets_res.map((asset) => ({
      amount: asset.amount,
      description: asset.description,
      image: asset.image_uri,
      isERC721: asset.erc_type === "erc721",
      metadataUrl: asset.token_uri,
      name: asset.name,
      network: chainId,
      owner: asset.owner,
      platform: asset.contract_address,
      token: Number(asset.token_id).toString(),
    }));
    return assets;
  }
  return [];
};

export const getNFTAsset = async (contract, id, chainId) => {
  const response = await axios.get(
    `${NetworkData[chainId].nftscan}/assets/${contract}/${id}?show_attribute=false`,
    {
      headers: {
        "X-API-KEY": process.env.REACT_APP_NFT_KEY,
      },
    }
  );
  if (response.status === 200) {
    const asset = response.data.data;
    if (asset)
      return {
        amount: asset.amount,
        description: asset.description,
        image: asset.image_uri,
        isERC721: asset.erc_type === "erc721",
        metadataUrl: asset.token_uri,
        name: asset.name,
        network: chainId,
        owner: asset.owner,
        platform: asset.contract_address,
        token: Number(asset.token_id).toString(),
      };
    return null;
  }
  return null;
};

export const isCID = (input) => {
  // Match a CIDv0 (starts with "Qm") or CIDv1 (Base32 alphanumeric, starts with "b")
  // Allow for optional paths appended to the CID
  const cidWithPathRegex =
    /^(Qm[a-zA-Z0-9]{44}|b[afkqz]{1}[a-zA-Z0-9]{46,})(\/.*)?$/;

  // Check if the input matches the pattern
  return cidWithPathRegex.test(input);
};
