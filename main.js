const serverUrl = "https://73o8r4xihl80.usemoralis.com:2053/server"; //Server url from moralis.io
const appId = "a6KKLhQIU6B0WUZogp4n6VrdbRTUTWN3Dhcg96HO"; // Application id from moralis.io


let currentTrade = {};
let currentSelectSide;
let tokens;
let chainsArray = ["eth", "bsc", "polygon"];
let chainStorage = window.localStorage;
let currentChain = chainStorage.getItem("chain");


//ETH
function setEth() {
  chainStorage.setItem("chain", chainsArray[0])
  location.reload();
  console.log("ETH")
}
document.getElementById('eth-btn').addEventListener('click', setEth)

//BSC
function setBsc() {
  chainStorage.setItem("chain", chainsArray[1])
  location.reload();
  console.log("BSC")
}
document.getElementById('bsc-btn').addEventListener('click', setBsc)


//POLYGON
function setPolygon() {
  chainStorage.setItem("chain", chainsArray[2])
  location.reload();
  console.log("POLYGON")
}
document.getElementById('polygon-btn').addEventListener('click', setPolygon)


async function init() {
  await Moralis.start({ serverUrl, appId });
  await Moralis.enableWeb3();
  await listAvailableTokens();
  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById("swap_button").disabled = false;
  }
}

async function listAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: currentChain, 
  });
  tokens = result.tokens;
  let parent = document.getElementById("token_list");
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement("div");
    div.setAttribute("data-address", address);
    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function selectToken(address) {
  closeModal();
  console.log(tokens);
  currentTrade[currentSelectSide] = tokens[address];
  console.log(currentTrade);
  renderInterface();
  getQuote();
}

function renderInterface() {
  if (currentTrade.from) {
    document.getElementById("from_token_img").src = currentTrade.from.logoURI;
    document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
  }
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.authenticate();
    }
    document.getElementById("swap_button").disabled = false;
  } catch (error) {
    console.log(error);
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}
function closeModal() {
  document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
  if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;

  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

  const quote = await Moralis.Plugins.oneInch.quote({
    chain: currentChain, 
    fromTokenAddress: currentTrade.from.address, 
    toTokenAddress: currentTrade.to.address, 
    amount: amount,
  });
  console.log(quote);
  document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
  document.getElementById("to_amount").value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

async function trySwap() {
  let address = Moralis.User.current().get("ethAddress");
  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  if (currentTrade.from.symbol !== "ETH") {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: currentChain, 
      fromTokenAddress: currentTrade.from.address, 
      fromAddress: address, 
      amount: amount,
    });
    console.log(allowance);
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: currentChain, 
        tokenAddress: currentTrade.from.address, 
        fromAddress: address, 
      });
    }
  }
  try {
    let receipt = await doSwap(address, amount);
    alert("Swap Complete");
  } catch (error) {
    console.log(error);
  }
}

function doSwap(userAddress, amount) {
  return Moralis.Plugins.oneInch.swap({
    chain: currentChain, 
    fromTokenAddress: currentTrade.from.address, 
    toTokenAddress: currentTrade.to.address, 
    amount: amount,
    fromAddress: userAddress, 
    slippage: 1,
  });
}

init();

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;