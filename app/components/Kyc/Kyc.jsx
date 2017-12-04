import React from "react";
import BalanceComponent from "../Utility/BalanceComponent";
import AccountActions from "actions/AccountActions";
import Translate from "react-translate-component";
import AccountSelect from "../Forms/AccountSelect";
import AccountSelector from "../Account/AccountSelector";
import AccountStore from "stores/AccountStore";
import AmountSelector from "../Utility/AmountSelector";
import utils from "common/utils";
import counterpart from "counterpart";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import { RecentTransactions } from "../Account/RecentTransactions";
import Immutable from "immutable";
import {ChainStore} from "bitsharesjs/es";
import {connect} from "alt-react";
import { checkFeeStatusAsync, checkBalance } from "common/trxHelper";
import { debounce, isNaN } from "lodash";
import classnames from "classnames";
import { Asset } from "common/MarketClasses";

class Kyc extends React.Component {

    constructor(props) {
        super(props);
        this.state = Kyc.getInitialState();
        let {query} = this.props.location;

        if(query.from) {
            this.state.from_name = query.from;
            ChainStore.getAccount(query.from);
        }
        if(query.to) {
            this.state.to_name = query.to;
            ChainStore.getAccount(query.to);
        }
        if(query.amount) this.state.amount = query.amount;
        if(query.asset) {
            this.state.asset_id = query.asset;
            this.state.asset = ChainStore.getAsset(query.asset);
        }
        if(query.memo) this.state.memo = query.memo;
        let currentAccount = AccountStore.getState().currentAccount;
        if (!this.state.from_name) this.state.from_name = currentAccount;
        this.onTrxIncluded = this.onTrxIncluded.bind(this);

        this._updateFee = debounce(this._updateFee.bind(this), 250);
        this._checkFeeStatus = this._checkFeeStatus.bind(this);
        this._checkBalance = this._checkBalance.bind(this);
    }

    static getInitialState() {
        return {
            from_name: "",
            to_name: "",
            from_account: null,
            to_account: null,
            amount: "",
            asset_id: null,
            asset: null,
            memo: "",
            error: null,
            propose: false,
            propose_account: "",
            feeAsset: null,
            fee_asset_id: "1.3.0",
            feeAmount: new Asset({amount: 0}),
            feeStatus: {},
            first_name: '',
            last_name: '',
            country: '',
            birthday: '',
            contact_email_telephone: '',
            address: '',
            kind_of_activity: ''
        };

    };

    componentWillMount() {
        this.nestedRef = null;
        this._updateFee();
        this._checkFeeStatus();
    }

    shouldComponentUpdate(np, ns) {
        let { asset_types: current_types } = this._getAvailableAssets();
        let { asset_types: next_asset_types } = this._getAvailableAssets(ns);

        if (next_asset_types.length === 1) {
            let asset = ChainStore.getAsset(next_asset_types[0]);
            if (current_types.length !== 1) {
                this.onAmountChanged({amount: ns.amount, asset});
            }

            if (next_asset_types[0] !== this.state.fee_asset_id) {
                if (asset && this.state.fee_asset_id !== next_asset_types[0]) {
                    this.setState({
                        feeAsset: asset,
                        fee_asset_id: next_asset_types[0]
                    });
                }
            }
        }
        return true;
    }

    componentWillReceiveProps(np) {
        if (np.currentAccount !== this.state.from_name && np.currentAccount !== this.props.currentAccount) {
            this.setState({
                from_name: np.currentAccount,
                from_account: ChainStore.getAccount(np.currentAccount),
                feeStatus: {},
                fee_asset_id: "1.3.0",
                feeAmount: new Asset({amount: 0})
            }, () => {this._updateFee(); this._checkFeeStatus(ChainStore.getAccount(np.currentAccount));});
        }
    }

    _checkBalance() {
        const {feeAmount, amount, from_account, asset} = this.state;
        if (!asset) return;
        const balanceID = from_account.getIn(["balances", asset.get("id")]);
        const feeBalanceID = from_account.getIn(["balances", feeAmount.asset_id]);
        if (!asset || ! from_account) return;
        if (!balanceID) return this.setState({balanceError: true});
        let balanceObject = ChainStore.getObject(balanceID);
        let feeBalanceObject = feeBalanceID ? ChainStore.getObject(feeBalanceID) : null;
        if (!feeBalanceObject || feeBalanceObject.get("balance") === 0) {
            this.setState({fee_asset_id: "1.3.0"}, this._updateFee);
        }
        if (!balanceObject || !feeAmount) return;
        const hasBalance = checkBalance(amount, asset, feeAmount, balanceObject);
        if (hasBalance === null) return;
        this.setState({balanceError: !hasBalance});
    }

    _checkFeeStatus(account = this.state.from_account) {
        if (!account) return;

        const assets = Object.keys(account.get("balances").toJS()).sort(utils.sortID);
        let feeStatus = {};
        let p = [];
        assets.forEach(a => {
            p.push(checkFeeStatusAsync({
                accountID: account.get("id"),
                feeID: a,
                options: ["price_per_kbyte"],
                data: {
                    type: "memo",
                    content: this.state.memo
                }
            }));
        });
        Promise.all(p).then(status => {
            assets.forEach((a, idx) => {
                feeStatus[a] = status[idx];
            });
            if (!utils.are_equal_shallow(this.state.feeStatus, feeStatus)) {
                this.setState({
                    feeStatus
                });
            }
            this._checkBalance();
        }).catch(err => {
            console.error(err);
        });
    }

    _updateFee(state = this.state) {
        let { fee_asset_id, from_account } = state;
        const { fee_asset_types } = this._getAvailableAssets(state);
        if ( fee_asset_types.length === 1 && fee_asset_types[0] !== fee_asset_id) {
            fee_asset_id = fee_asset_types[0];
        }
        if (!from_account) return null;
        checkFeeStatusAsync({
            accountID: from_account.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"],
            data: {
                type: "memo",
                content: state.memo
            }
        })
        .then(({fee, hasBalance, hasPoolBalance}) => {
            this.setState({
                feeAmount: fee,
                fee_asset_id: fee.asset_id,
                hasBalance,
                hasPoolBalance,
                error: (!hasBalance || !hasPoolBalance)
            });
        });
    }

    fromChanged(from_name) {
        if (!from_name) this.setState({from_account: null});
        this.setState({from_name, error: null, propose: false, propose_account: ""});
    }

    toChanged(to_name) {
        this.setState({to_name, error: null});
    }

    onFromAccountChanged(from_account) {
        this.setState({from_account, error: null}, () => {this._updateFee(); this._checkFeeStatus();});
    }

    onToAccountChanged(to_account) {
        this.setState({to_account, error: null});
    }

    onAmountChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState({amount, asset, asset_id: asset.get("id"), error: null}, this._checkBalance);
    }

    onFeeChanged({asset}) {
        this.setState({feeAsset: asset, fee_asset_id: asset.get("id"), error: null}, this._updateFee);
    }

    onMemoChanged(e) {
        this.setState({memo: e.target.value}, this._updateFee);
    }

    onTrxIncluded(confirm_store_state) {
        if(confirm_store_state.included && confirm_store_state.broadcasted_transaction) {
            // this.setState(Transfer.getInitialState());
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        } else if (confirm_store_state.closed) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        }
    }

    onPropose(propose, e) {
        e.preventDefault();
        this.setState({ propose, propose_account: null });
    }

    onProposeAccount(propose_account) {
        this.setState({ propose_account });
    }

    resetForm(){
        this.setState({memo: '', to_name: '', amount: ''});
    }

    onSubmit(e) {
        e.preventDefault();
        this.setState({error: null});
        const {asset, amount} = this.state;
        const sendAmount = new Asset({real: amount, asset_id: asset.get("id"), precision: asset.get("precision")});

        AccountActions.transfer(
            this.state.from_account.get("id"),
            this.state.to_account.get("id"),
            sendAmount.getAmount(),
            asset.get("id"),
            this.state.memo ? new Buffer(this.state.memo, "utf-8") : this.state.memo,
            this.state.propose ? this.state.propose_account : null,
            this.state.feeAsset ? this.state.feeAsset.get("id") : "1.3.0"
        ).then( () => {
            this.resetForm.call(this);
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.listen(this.onTrxIncluded);
        }).catch( e => {
            let msg = e.message ? e.message.split( '\n' )[1] : null;
            console.log( "error: ", e, msg);
            this.setState({error: msg});
        } );
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }


  onKYCformInputChanged (e) {
        this.setState({[e.taget.id]: e.target.value});
    }

    _setTotal(asset_id, balance_id) {
        const {feeAmount} = this.state;
        let balanceObject = ChainStore.getObject(balance_id);
        let transferAsset = ChainStore.getObject(asset_id);

        let balance = new Asset({amount: balanceObject.get("balance"), asset_id: transferAsset.get("id"), precision: transferAsset.get("precision")});

        if (balanceObject) {
            if (feeAmount.asset_id === balance.asset_id) {
                balance.minus(feeAmount);
            }
            this.setState({amount: balance.getAmount({real: true})}, this._checkBalance);
        }
    }

    _getAvailableAssets(state = this.state) {
        const { feeStatus } = this.state;
        function hasFeePoolBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasPoolBalance;
        }

        function hasBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasBalance;
        }

        const { from_account, from_error } = state;
        let asset_types = [], fee_asset_types = [];
        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        asset_types = Object.keys(account_balances).sort(utils.sortID);
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
        for (let key in account_balances) {
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                asset_types.splice(asset_types.indexOf(key), 1);
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }

        fee_asset_types = fee_asset_types.filter(a => {
            return hasFeePoolBalance(a) && hasBalance(a);
        });

        return {asset_types, fee_asset_types};
    }

    _onAccountDropdown(account) {
        let newAccount = ChainStore.getAccount(account);
        if (newAccount) {
            this.setState({
                from_name: account,
                from_account: ChainStore.getAccount(account)
            });
        }
    }

    render() {
        let {error, from_name, first_name, last_name, country, birthday, contact_email_telephone, address, kind_of_activity} = this.state;



        return (
            <div className="grid-block vertical">
            <div className="grid-block shrink vertical medium-horizontal" style={{paddingTop: "2rem"}}>

                <form style={{paddingBottom: 20, overflow: "visible"}} className="grid-content small-12 medium-6 large-5 large-offset-1 full-width-content" onSubmit={this.onSubmit.bind(this)} noValidate>

                    <Translate content="kyc.header" component="h2" />
                  {/*  First name  */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.first_name" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}} value={first_name} id="first_name" onChange={this.onKYCformInputChanged.bind(this)} />
                      {/* warning */}
                      {/*{ this.state.propose ?*/}
                        {/*<div className="error-area" style={{position: "absolute"}}>*/}
                            {/*<Translate content="transfer.warn_name_unable_read_memo" name={this.state.from_name} />*/}
                        {/*</div>*/}
                        {/*:null}*/}

                    </div>

                  {/*  First name  */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.last_name" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}} value={last_name} id="last_name" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Country */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.country" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}} value={country} id="country" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                    <button className={classnames("button float-right no-margin", {disabled: isSendNotValid})} type="submit" value="Submit" tabIndex={tabIndex++}>
                        <Translate component="span" content="transfer.send" />
                    </button>
                </form>
              </div>
            </div>
        );
    }
}

export default connect(Kyc, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {
            currentAccount: AccountStore.getState().currentAccount,
            passwordAccount: AccountStore.getState().passwordAccount
        };
    }
});
