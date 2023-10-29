import React, { useEffect, useState } from 'react';
import Web3Modal from 'web3modal';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ethers } from 'ethers';
import axios from 'axios';
import { create } from 'ipfs-http-client';

import { MarketAddress, MarketAddressABI } from './constants';

const projectId = process.env.NEXT_PUBLIC_INFURA_API_KEY;
const projectSecret = process.env.NEXT_PUBLIC_INFURA_API_KEY_SECRET;
// eslint-disable-next-line prefer-template
const auth = 'Basic ' + Buffer.from(`${projectId}:${projectSecret}`).toString('base64');

const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

export const NFTContext = React.createContext();

const fetchContract = (signerOrProvider) => new ethers.Contract(MarketAddress, MarketAddressABI, signerOrProvider);

export const NFTProvider = ({ children }) => {
  const nftCurrency = 'ETH';
  const [currentAccount, setCurrentAccount] = useState('');
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);

  const fetchNFTs = async () => {
    // setIsLoadingNFT(false);

    const provider = new ethers.providers.JsonRpcProvider();
    const contract = fetchContract(provider);

    const data = await contract.fetchMarketItems();

    console.log(data);
    // const items = await Promise.all(data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
    //   const tokenURI = await contract.tokenURI(tokenId);
    //   const { data: { image, name, description } } = await axios.get(tokenURI);
    //   const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');

    //   return { price, tokenId: tokenId.toNumber(), id: tokenId.toNumber(), seller, owner, image, name, description, tokenURI };
    // }));

    // return items;
  };

  const createSale = async (url, formInputPrice, isReselling, id) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const price = ethers.utils.parseUnits(formInputPrice, 'ether');
    const contract = fetchContract(signer);
    const listingPrice = await contract.getListingPrice();

    const transaction = await contract.createToken(url, price, { value: listingPrice.toString() });
    // const transaction = !isReselling
    //   ? await contract.createToken(url, price, { value: listingPrice.toString() })
    //   : await contract.resellToken(id, price, { value: listingPrice.toString() });

    // setIsLoadingNFT(true);
    await transaction.wait();
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask.');

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    setCurrentAccount(accounts[0]);
    window.location.reload();
  };

  const checkIfWalletIsConnect = async () => {
    if (!window.ethereum) return alert('Please install MetaMask.');

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if (accounts.length) {
      setCurrentAccount(accounts[0]);
    } else {
      console.log('No accounts found');
    }
  };

  const uploadToIPFS = async (file, setFileUrl) => {
    try {
      const added = await client.add({ content: file });

      const url = `https://ipfs.io/ipfs/${added.path}`;

      return url;
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  };

  const createNFT = async (formInput, fileUrl, router) => {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({ name, description, image: fileUrl });
    try {
      const added = await client.add(data);
      const url = `https://ipfs.io/ipfs/${added.path}`;
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      await createSale(url, price);
      router.push('/');
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
  }, []);

  return (
    <NFTContext.Provider value={{ nftCurrency, createSale, fetchNFTs, connectWallet, createNFT, currentAccount, isLoadingNFT, uploadToIPFS }}>
      {children}
    </NFTContext.Provider>
  );
};
