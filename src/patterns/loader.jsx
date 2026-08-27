import { useWeb3React } from "@web3-react/core";
import React from "react";
import { NetworkData } from "../utils/config";

const Loader = () => {
  const { account, chainId } = useWeb3React();
  return (
    <div className="loader">
      <img src={account ? NetworkData[chainId].loader : NetworkData[1].loader} alt="loader" style={{ width: "8em" }} />
    </div>
  );
};

export default React.memo(Loader);
