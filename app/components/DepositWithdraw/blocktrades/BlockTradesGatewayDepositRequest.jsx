import React from "react";
import Translate from "react-translate-component";
import { ChainStore } from "bitsharesjs/es";
import ChainTypes from "components/Utility/ChainTypes";
import BindToChainState from "components/Utility/BindToChainState";
import WithdrawModalBlocktrades from "./WithdrawModalBlocktrades";
import BaseModal from "../../Modal/BaseModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import AccountBalance from "../../Account/AccountBalance";
import BlockTradesDepositAddressCache from "common/BlockTradesDepositAddressCache";
import AssetName from "components/Utility/AssetName";
import LinkToAccountById from "components/Utility/LinkToAccountById";
import { requestDepositAddress } from "common/blockTradesMethods";
import { blockTradesAPIs } from "api/apiConfig";
import LoadingIndicator from "components/LoadingIndicator";

class BlockTradesGatewayDepositRequest extends React.Component {
  static propTypes = {
    url:                React.PropTypes.string,
    gateway:            React.PropTypes.string,

    deposit_coin_type:  React.PropTypes.string,
    deposit_asset_name: React.PropTypes.string,
    deposit_account:    React.PropTypes.string,
    receive_coin_type:  React.PropTypes.string,

    account:             ChainTypes.ChainAccount,
    issuer_account:      ChainTypes.ChainAccount,
    deposit_asset:       React.PropTypes.string,
    deposit_wallet_type: React.PropTypes.string,

    receive_asset:          ChainTypes.ChainAsset,
    deprecated_in_favor_of: ChainTypes.ChainAsset,
    deprecated_message:     React.PropTypes.string,
    action:                 React.PropTypes.string,
    supports_output_memos:  React.PropTypes.bool.isRequired
  }

  static defaultProps = {
    autosubscribe: false
  }

  constructor(props) {
    super(props);

    this.depositAddressCache = new BlockTradesDepositAddressCache();

    let urls = { blocktrades: blockTradesAPIs.BASE, openledger: blockTradesAPIs.BASE_OL };

    const url = props.url || urls[props.gateway];
    const receive_address = null;

    this.state = { receive_address, url };
  }

  componentWillMount () {
    this.fetchDepositAddress();
  }

  componentDidMount () {
    document.addEventListener("copy", this.doTheCopy);
  }

  componentWillUnmount () {
    document.removeEventListener("copy", this._copy);
  }

  /**
   * Copy some stuff to clipboard
   */
  toClipboard = (clipboardText) => {
    try {
      this.setState({ clipboardText }, () => document.execCommand("copy"));
    } catch(err) {
      console.error(err);
    }
  }

  doTheCopy = (e) => {
    try {
      e.clipboardData.setData("text/plain", this.state.clipboardText);
      e.preventDefault();
    } catch(err) {
      console.error(err);
    }
  }

  /**
   * Fetch Deposit Address
   */
  fetchDepositAddress = () => {
    const account_name = this.props.account.get("name");
    const address = this.depositAddressCache.getCachedInputAddress(this.props.gateway, account_name, this.props.deposit_coin_type, this.props.receive_coin_type);

    const updateState = (receive_address) => this.setState({ receive_address });

    if (!address || address.address === "unknown") {
      const inputCoinType = this.props.deposit_coin_type;
      const outputCoinType = this.props.receive_coin_type;
      const outputAddress = this.props.account.get("name");
      const url = this.state.url;

      requestDepositAddress({ inputCoinType, outputCoinType, outputAddress, url }, (address) => {
        let account_name = this.props.account.get("name");
        this.depositAddressCache.cacheInputAddress(this.props.gateway, account_name, this.props.deposit_coin_type, this.props.receive_coin_type, address.address, address.memo);
        updateState(address);
      });
    } else {
      updateState(address);
    }
  }

  getWithdrawModalId = () => {
    const name = this.props.issuer_account.get("name");
    const symbol = this.props.receive_asset.get("symbol");

    return "withdraw_asset_" + name + "_" + symbol;
  }

  onWithdraw() {
    ZfApi.publish(this.getWithdrawModalId(), "open");
  }

  render() {
    const isDeposit = this.props.action === "deposit";
    let emptyRow = <div style={{display:"none", minHeight: 150}}></div>;
    if( !this.props.account || !this.props.issuer_account || !this.props.receive_asset )
      return emptyRow;

    let account_balances_object = this.props.account.get("balances");

    const { gateFee } = this.props;

    let balance = "0 " + this.props.receive_asset.get("symbol");
    if (this.props.deprecated_in_favor_of) {
      let has_nonzero_balance = false;
      let balance_object_id = account_balances_object.get(this.props.receive_asset.get("id"));
      if (balance_object_id) {
        let balance_object = ChainStore.getObject(balance_object_id);
        if (balance_object) {
          let balance = balance_object.get("balance");
          if (balance != 0)
              has_nonzero_balance = true;
        }
      }
      if (!has_nonzero_balance)
          return emptyRow;
    }

    // let account_balances = account_balances_object.toJS();
    // let asset_types = Object.keys(account_balances);
    // if (asset_types.length > 0) {
    //     let current_asset_id = this.props.receive_asset.get("id");
    //     if( current_asset_id )
    //     {
    //         balance = (<span><Translate component="span" content="transfer.available"/>: <BalanceComponent balance={account_balances[current_asset_id]}/></span>);
    //     }
    // }

    let receive_address = this.state.receive_address;
    if( !receive_address )  {
      let account_name = this.props.account.get("name");
      receive_address = this.depositAddressCache.getCachedInputAddress(this.props.gateway, account_name, this.props.deposit_coin_type, this.props.receive_coin_type);
    }

    if( !receive_address) {
      this.fetchDepositAddress();
      return <div style={{margin: "3rem"}}><LoadingIndicator type="three-bounce"/></div>;
    }

    let withdraw_modal_id = this.getWithdrawModalId();
    let deposit_address_fragment = null;
    let deposit_memo = null;
    // if (this.props.deprecated_in_favor_of)
    // {
    //     deposit_address_fragment = <span>please use {this.props.deprecated_in_favor_of.get("symbol")} instead. <span data-tip={this.props.deprecated_message} data-place="right" data-html={true}><Icon name="question-circle" /></span><ReactTooltip /></span>;
    // }
    // else
    // {
    let clipboardText = "";
    let memoText;
    if (this.props.deposit_account) {
      deposit_address_fragment = (<span>{this.props.deposit_account}</span>);
      clipboardText = this.props.receive_coin_type + ":" + this.props.account.get("name");
      deposit_memo = <span>{clipboardText}</span>;
      var withdraw_memo_prefix = this.props.deposit_coin_type + ":";
    } else {
      if (receive_address.memo) {
        // This is a client that uses a deposit memo (like ethereum), we need to display both the address and the memo they need to send
        memoText = receive_address.memo;
        clipboardText = receive_address.address;
        deposit_address_fragment = (<span>{receive_address.address}</span>);
        deposit_memo = <span>{receive_address.memo}</span>;
      } else {
        // This is a client that uses unique deposit addresses to select the output
        clipboardText = receive_address.address;
        deposit_address_fragment = (<span>{receive_address.address}</span>);
      }
      var withdraw_memo_prefix = "";
    }

    if (!this.props.isAvailable || (isDeposit && !this.props.deposit_account && !this.state.receive_address)) {
      return <div><Translate className="txtlabel cancel" content="gateway.unavailable" component="h4" /></div>;
    }

    if (isDeposit) {
        return (
          <div className="Blocktrades__gateway grid-block no-padding no-margin">
            <div className="small-12 medium-5">
              <Translate component="h4" content="gateway.deposit_summary" />
              <div className="small-12 medium-10">
                <table className="table">
                  <tbody>
                    <tr>
                      <Translate component="td" content="gateway.asset_to_deposit" />
                      <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}>{this.props.deposit_asset}</td>
                    </tr>
                    <tr>
                      <Translate component="td" content="gateway.asset_to_receive" />
                      <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}><AssetName name={this.props.receive_asset.get("symbol")} replace={false} /></td>
                    </tr>
                    <tr>
                      <Translate component="td" content="gateway.intermediate" />
                      <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}><LinkToAccountById account={this.props.issuer_account.get("id")} /></td>
                    </tr>
                    <tr>
                      <Translate component="td" content="gateway.your_account" />
                      <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}><LinkToAccountById account={this.props.account.get("id")} /></td>
                    </tr>
                    <tr>
                      <td><Translate content="gateway.balance" />:</td>
                      <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}>
                        <AccountBalance
                          account={this.props.account.get("name")}
                          asset={this.props.receive_asset.get("symbol")}
                          replace={false}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="small-12 medium-7">
              <Translate component="h4" content="gateway.deposit_inst" />
              <label className="left-label"><Translate content="gateway.deposit_to" asset={this.props.deposit_asset} />:</label>
              <div style={{padding: "10px 0", fontSize: "1.1rem", fontWeight: "bold"}}>
                <table className="table">
                  <tbody>
                    <tr>
                      <td>{deposit_address_fragment}</td>
                    </tr>
                    {deposit_memo ? (
                    <tr>
                      <td>memo: {deposit_memo}</td>
                    </tr>) : null}
                  </tbody>
                </table>
                <div className="button-group" style={{paddingTop: 10}}>
                  {deposit_address_fragment ? <div className="button" onClick={this.toClipboard.bind(this, clipboardText)}>Copy address</div> : null}
                  {memoText ? <div className="button" onClick={this.toClipboard.bind(this, memoText)}>Copy memo</div> : null}
                  <button className={"button"} onClick={this.fetchDepositAddress}><Translate content="gateway.generate_new" /></button>
                </div>
              </div>
            </div>
          </div>
        );
    } else {
      return (
        <div className="Blocktrades__gateway grid-block no-padding no-margin">
          <div className="small-12 medium-5">
            <Translate component="h4" content="gateway.withdraw_summary" />
            <div className="small-12 medium-10">
              <table className="table">
                <tbody>
                  <tr>
                    <Translate component="td" content="gateway.asset_to_withdraw" />
                    <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}><AssetName name={this.props.receive_asset.get("symbol")} replace={false} /></td>
                  </tr>
                  <tr>
                    <Translate component="td" content="gateway.asset_to_receive" />
                    <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}>{this.props.deposit_asset}</td>
                  </tr>
                  <tr>
                    <Translate component="td" content="gateway.intermediate" />
                    <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}><LinkToAccountById account={this.props.issuer_account.get("id")} /></td>
                  </tr>
                  <tr>
                    <td><Translate content="gateway.balance" />:</td>
                    <td style={{fontWeight: "bold", color: "#4A90E2", textAlign: "right"}}>
                      <AccountBalance
                        account={this.props.account.get("name")}
                        asset={this.props.receive_asset.get("symbol")}
                        replace={false}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/*<p>When you withdraw {this.props.receive_asset.get("symbol")}, you will receive {this.props.deposit_asset} at a 1:1 ratio (minus fees).</p>*/}

          </div>
          <div className="small-12 medium-7">
            <Translate component="h4" content="gateway.withdraw_inst" />
            <label className="left-label"><Translate content="gateway.withdraw_to" asset={this.props.deposit_asset} />:</label>
            <div className="button-group" style={{paddingTop: 20}}>
              <button className="button success" style={{fontSize: "1.3rem"}} onClick={this.onWithdraw.bind(this)}><Translate content="gateway.withdraw_now" /> </button>
            </div>
          </div>
          <BaseModal id={withdraw_modal_id} overlay={true}>
            <br/>
            <div className="grid-block vertical">
              <WithdrawModalBlocktrades
                account={this.props.account.get("name")}
                issuer={this.props.issuer_account.get("name")}
                asset={this.props.receive_asset.get("symbol")}
                url={this.state.url}
                output_coin_name={this.props.deposit_asset_name}
                gateFee={gateFee}
                output_coin_symbol={this.props.deposit_asset}
                output_coin_type={this.props.deposit_coin_type}
                output_wallet_type={this.props.deposit_wallet_type}
                output_supports_memos={this.props.supports_output_memos}
                memo_prefix={withdraw_memo_prefix}
                modal_id={withdraw_modal_id}
                balance={this.props.account.get("balances").toJS()[this.props.receive_asset.get("id")]} />
            </div>
          </BaseModal>
        </div>
      );
    }
  }
};

export default BindToChainState(BlockTradesGatewayDepositRequest, {keep_updating:true});
