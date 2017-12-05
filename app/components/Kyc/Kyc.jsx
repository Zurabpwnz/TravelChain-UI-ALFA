import React from "react";
import Translate from "react-translate-component";
import classnames from "classnames";
import axios from "axios";
import ls from "common/localStorage";

const STORAGE_KEY = "__graphene__";
let ss = new ls(STORAGE_KEY);

class Kyc extends React.Component {

    constructor(props) {
        super(props);
        this.state = Kyc.getInitialState();

    }

    static getInitialState() {
        return {
            first_name: "",
            surname: "",
            country: "",
            birthday: "",
            email: "",
            phone: "",
            address: "",
            activity: ""
        };

    };

    resetForm() {
        this.setState({
            first_name: "",
            surname: "",
            country: "",
            birthday: "",
            email: "",
            phone: "",
            address: "",
            activity: ""
        });
    }


    componentWillMount () {
      // axios.get("https://testnet.travelchain.io/api/accounts/me/", {
      //   headers: {
      //     Authorization: `JWT ${ss.get("backend_token")}`
      //   }
      // }).then((response) => response.data.is_verified ? this.props.router.push("/dashboard") : false)
      //   .catch(() => this.props.router.push("/dashboard"));
    }

    onSubmit(e) {
        e.preventDefault();

        axios({
          method: "PUT",
          url: 'https://testnet.travelchain.io/api/accounts/me/',
          data: {...this.state},
          headers: {
            'Authorization': `JWT ${ss.get('backend_token')}`
          }
        }).then(() => this.props.router.push('/deposit-withdraw'))
          .catch((e) => console.log(e));
    }



    onKYCformInputChanged (e) {
        this.setState({[e.target.id]: e.target.value});
    }


    render() {
        // let {error, first_name, surname, country, birthday, email_telephone, address, activity} = this.state;

        let isSendNotValid = false;
        // let isAgree = false;

        return (
            <div className="grid-block vertical">
            <div className="grid-block shrink vertical medium-horizontal" style={{paddingTop: "2rem"}}>

                <form style={{paddingBottom: 20, overflow: "visible"}} className="grid-content small-12 medium-6 large-5 large-offset-1 full-width-content" onSubmit={this.onSubmit.bind(this)} noValidate>

                    <Translate content="kyc.header" component="h2" />
                  {/*  First name  */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.first_name" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}} id="first_name" onChange={this.onKYCformInputChanged.bind(this)} />
                      {/* warning */}
                      {/*{ this.state.propose ?*/}
                        {/*<div className="error-area" style={{position: "absolute"}}>*/}
                            {/*<Translate content="transfer.warn_name_unable_read_memo" name={this.state.from_name} />*/}
                        {/*</div>*/}
                        {/*:null}*/}

                    </div>

                  {/*  First name  */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.surname" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}} id="surname" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Country */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.country" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}}  id="country" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Birthday */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.birthday" data-place="top"/>
                        <input type="date" style={{marginBottom: 0}}  id="birthday" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Contact email */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.email" data-place="top"/>
                        <input type="email" style={{marginBottom: 0}}  id="email" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Contact phone */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.phone" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}}  id="phone" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Address */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.address" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}}  id="address" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                  {/* Kind of activity */}
                    <div className="content-block transfer-input">
                        <Translate className="left-label tooltip" component="label" content="kyc.activity" data-place="top"/>
                        <input type="text" style={{marginBottom: 0}}  id="activity" onChange={this.onKYCformInputChanged.bind(this)} />
                    </div>

                    {/*<input type="checkbox" ref={'isAgree'}/>*/}

                    <button className={classnames("button float-right no-margin", {disabled: isSendNotValid})} type="submit" value="Submit">
                        <Translate component="span" content="transfer.send" />
                    </button>
                </form>
              </div>
            </div>
        );
    }
}

export default Kyc;
