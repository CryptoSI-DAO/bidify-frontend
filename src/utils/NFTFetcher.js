import { FetchWrapper } from "use-nft";
import { ethers, Contract } from "ethers";
import axios from 'axios';
import { baseUrl, URLS } from "./config";

// use-nft needs an ethers provider; route through our keyless public RPCs.
const defaultProvider = () => new ethers.providers.JsonRpcProvider(URLS[1]);

export const getNfts = async (platform, token) => {
  const ethersConfig = {
    ethers: { Contract },
    provider: defaultProvider(),
  };
  const fetcher = ["ethers", ethersConfig];

  function ipfsUrl(cid, path = "") {
    return `https://dweb.link/ipfs/${cid}${path}`;
  }

  const fetchWrapper = new FetchWrapper(fetcher, {
    jsonProxy: (url) => {
      return url;
    },
    ipfsUrl: (cid, path) => {
      return ipfsUrl(cid, path);
    },
  });

  const result = await fetchWrapper.fetchNft(platform, token).catch((err) => {
    console.log(err);
  });

  return result;
};

export const getBase64ImageBuffer = (imgUrl) => {
  if (imgUrl.includes('storageapi.fleek.co')) return Promise.reject("already uploaded");
  const request = require("request").defaults({ encoding: null });
  return new Promise(
    (resolve, reject) => {
      request.get(
        imgUrl,
        (error, response, body) => {
          if (error) reject('Something went wrong!!!');
          if (!error && response.statusCode === 200) {
            const data =
              "data:" +
              response.headers["content-type"] +
              ";base64," +
              Buffer.from(body).toString("base64");
            resolve(Buffer.from(data.replace(/^data:image\/(png|jpg|gif|jpeg);base64,/, ""), 'base64'));
          }
          else reject('Something went wrong!!!');
        }
      );
    });
}

export const getNftsByMoralis = async (address, cursor, chainId) => {
  const resp = await axios.get(`${baseUrl}/fetchWalletNfts`, { params: { address, cursor, chainId } });
  return resp.data;
}
