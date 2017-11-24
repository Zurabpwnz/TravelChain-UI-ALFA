import React from "react";
import { connect } from "alt-react";
import Translate from "react-translate-component";

import accountUtils from "common/account_utils";
import utils        from "common/utils";

import ChainTypes       from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import HelpContent      from "../Utility/HelpContent";

import { Apis } from "bitsharesjs-ws";
import { settingsAPIs, rudexAPIs } from "api/apiConfig";

import AccountStore    from "stores/AccountStore";
import SettingsStore   from "stores/SettingsStore";
import GatewayStore    from "stores/GatewayStore";
import SettingsActions from "actions/SettingsActions";
import GatewayActions  from "actions/GatewayActions";

import BlockTradesGateway               from "../DepositWithdraw/BlockTradesGateway";
import BitKapital                       from "../DepositWithdraw/BitKapital";
import RuDexGateway                     from "../DepositWithdraw/rudex/RuDexGateway";
import OpenLedgerFiatDepositWithdrawal  from "../DepositWithdraw/openledger/OpenLedgerFiatDepositWithdrawal";
import OpenLedgerFiatTransactionHistory from "../DepositWithdraw/openledger/OpenLedgerFiatTransactionHistory";
import BlockTradesBridgeDepositRequest  from "../DepositWithdraw/blocktrades/BlockTradesBridgeDepositRequest";

import AccountImage from "../Account/AccountImage";

/**
 *
 * @TODO remove openledger stuff and put our own
 */
class AccountDepositWithdraw extends React.Component {

  static propTypes = {
    account: ChainTypes.ChainAccount.isRequired,
    contained: React.PropTypes.bool
  };

  static defaultProps = {
    contained: false
  };

  constructor(props) {
    super(props);

    this.state = {
      olService:     props.viewSettings.get("olService", "gateway"),
      rudexService:  props.viewSettings.get("rudexService", "gateway"),
      btService:     props.viewSettings.get("btService", "bridge"),
      metaService:   props.viewSettings.get("metaService", "bridge"),
      activeService: props.viewSettings.get("activeService", 0)
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      nextProps.account !== this.props.account ||
      nextProps.servicesDown !== this.props.servicesDown ||
      !utils.are_equal_shallow(nextProps.blockTradesBackedCoins, this.props.blockTradesBackedCoins) ||
      !utils.are_equal_shallow(nextProps.openLedgerBackedCoins, this.props.openLedgerBackedCoins) ||
      nextState.olService !== this.state.olService ||
      nextState.rudexService !== this.state.rudexService ||
      nextState.btService !== this.state.btService ||
      nextState.metaService !== this.state.metaService ||
      nextState.activeService !== this.state.activeService
    );
  }

  componentWillMount() {
    accountUtils.getFinalFeeAsset(this.props.account, "transfer");
  }

  toggleOLService(olService) {
    this.setState({ olService });
    SettingsActions.changeViewSetting({ olService });
  }

  toggleRuDEXService(rudexService) {
    this.setState({ rudexService });
    SettingsActions.changeViewSetting({ rudexService });
  }

  toggleBTService(btService) {
    this.setState({ btService });
    SettingsActions.changeViewSetting({ btService });
  }

  toggleMetaService(metaService) {
    this.setState({ metaService });
    SettingsActions.changeViewSetting({ metaService });
  }

  /**
   * This code was here commented:
   *   let index = this.state.services.indexOf(e.target.value);
   */
  onSetService(e) {
    const activeService = parseInt(e.target.value);

    this.setState({ activeService });
    SettingsActions.changeViewSetting({ activeService });
  }

  /**
   * Create the only service we need
   *
   * <div className="float-right">
   *   <a href="https://www.ccedk.com/" target="__blank" rel="noopener noreferrer"><Translate content="gateway.website" /></a>
   * </div>
   */
  renderDAComCore = (account, olService, btService, rudexService, coins) => {
    const gateway = olService === "gateway" && coins.length
      ? (<BlockTradesGateway
          account={account}
          coins={coins}
          provider="openledger"
        />)
      : null;

    const bottom = olService === "fiat"
      ? (<div>
          <div style={{paddingBottom: 15}}>
            <Translate component="h5" content="gateway.fiat_text" />
          </div>

          <OpenLedgerFiatDepositWithdrawal
            rpc_url={settingsAPIs.RPC_URL}
            account={account}
            issuer_account="openledger-fiat" />
          <OpenLedgerFiatTransactionHistory
            rpc_url={settingsAPIs.RPC_URL}
            account={account} />
        </div>)
      : null;

    const serviceSelector = (
      <div className="service-selector">
        <ul className="button-group segmented no-margin">
          <li onClick={this.toggleOLService.bind(this, "gateway")} className={olService === "gateway" ? "is-active" : ""}>
          <a><Translate content="gateway.gateway" /></a></li>
          <li onClick={this.toggleOLService.bind(this, "fiat")} className={olService === "fiat" ? "is-active" : ""}>
          <a>Fiat</a></li>
        </ul>
      </div>
    );

    return (
      <div className="content-block">
        {serviceSelector}
        {gateway}
        {bottom}
      </div>
    );
  }

  /**
   * let services = ["Openledger (OPEN.X)", "BlockTrades (TRADE.X)", "Transwiser", "BitKapital"];
   */
  renderServices(openLedgerGatewayCoins, rudexGatewayCoins) {
    const { account } = this.props;
    const { olService, btService, rudexService } = this.state;

    const name     = "DACom Core";
    const template = this.renderDAComCore(account, olService, btService, rudexService, openLedgerGatewayCoins)

    return [{ name, template }];
  }

  render() {
    let { account, servicesDown } = this.props;
    let { activeService } = this.state;

    const sortBySymbol = (a, b) => a.symbol < b.symbol ? -1 : (a.symbol > b.symbol ? 1 : 0);

    let openLedgerGatewayCoins = this.props.openLedgerBackedCoins.sort(sortBySymbol)
    let rudexGatewayCoins = this.props.rudexBackedCoins.sort(sortBySymbol)

    let services = this.renderServices(openLedgerGatewayCoins, rudexGatewayCoins);

    let options = services.map((services_obj, index) => {
      return <option key={index} value={index}>{services_obj.name}</option>;
    });

    const serviceNames = ["OPEN", "RUDEX", "TRADE", "BITKAPITAL"];
    const currentServiceName = serviceNames[activeService];
    const currentServiceDown = servicesDown.get(currentServiceName);

    return (
      <div className={this.props.contained ? "grid-content" : "grid-container"}>
        <div className={this.props.contained ? "" : "grid-content"} style={{paddingTop: "2rem"}}>
          <Translate content="gateway.title" component="h2" />
          <div className="grid-block vertical medium-horizontal no-margin no-padding">
            <div className="medium-6 show-for-medium">
              <HelpContent path="components/DepositWithdraw" section="deposit-short"/>
            </div>
            <div className="medium-5 medium-offset-1">
              <HelpContent account={account.get("name")} path="components/DepositWithdraw" section="receive"/>
            </div>
          </div>
          <div>
            <div className="grid-block vertical medium-horizontal no-margin no-padding">
              <div className="medium-6 small-order-2 medium-order-1">
                <Translate component="label" className="left-label" content="gateway.service" />
                <select onChange={this.onSetService.bind(this)} className="bts-select" value={activeService} >
                  {options}
                </select>
                {
                  currentServiceDown
                  ? <Translate style={{color: "red", marginBottom: "1em", display: "block"}} content={`gateway.unavailable_${currentServiceName}`} />
                  : null
                }
              </div>
              <div className="medium-5 medium-offset-1 small-order-1 medium-order-2" style={{paddingBottom: 20}}>
                <Translate component="label" className="left-label" content="gateway.your_account" />
                <div className="inline-label">
                  <AccountImage
                    size={{height: 40, width: 40}}
                    account={account.get("name")} custom_image={null}
                  />
                  <input type="text"
                     value={account.get("name")}
                     placeholder={null}
                     disabled
                     onChange={() => {}}
                     onKeyDown={() => {}}
                     tabIndex={1}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid-content no-padding" style={{paddingTop: 15}}>
            {currentServiceDown ? null : activeService && services[activeService] ? services[activeService].template : services[0].template}
          </div>
        </div>
      </div>
    );
  }
};

AccountDepositWithdraw = BindToChainState(AccountDepositWithdraw);

class DepositStoreWrapper extends React.Component {
  componentWillMount() {
    if (Apis.instance().chain_id.substr(0, 8) === "4018d784") { // Only fetch this when on BTS main net
      GatewayActions.fetchCoins.defer(); // Openledger
      GatewayActions.fetchCoinsSimple.defer({ backer: "RUDEX", url: rudexAPIs.BASE+rudexAPIs.COINS_LIST }); // RuDEX
      GatewayActions.fetchCoins.defer({ backer: "TRADE" }); // Blocktrades
    }
  }

  render() {
    return <AccountDepositWithdraw {...this.props}/>;
  }
}

export default connect(DepositStoreWrapper, {
  listenTo() {
    return [AccountStore, SettingsStore, GatewayStore];
  },
  getProps() {
    return {
      account:                AccountStore.getState().currentAccount,
      viewSettings:           SettingsStore.getState().viewSettings,
      openLedgerBackedCoins:  GatewayStore.getState().backedCoins.get("OPEN", []),
      rudexBackedCoins:       GatewayStore.getState().backedCoins.get("RUDEX", []),
      blockTradesBackedCoins: GatewayStore.getState().backedCoins.get("TRADE", []),
      servicesDown:           GatewayStore.getState().down || {}
    };
  }
});
