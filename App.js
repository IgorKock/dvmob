import 'react-native-get-random-values' // react native moment
import './shim' // react native moment 2
import React from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, StatusBar, Dimensions } from 'react-native';
import SideMenu from 'react-native-side-menu-updated';
import { RelationshipStatus } from "revolt-api/types/Users";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import { currentTheme, styles } from './src/Theme'
import { Text, client, app } from './src/Generic'
import { Messages, ReplyMessage } from './src/MessageView'
import { MessageBox } from './src/MessageBox';
import { MiniProfile, Avatar, Username } from './src/Profile'
import { setFunction } from './src/Generic';
import { LeftMenu, RightMenu } from './src/SideMenus';
import { Modals } from './src/Modals';
import FastImage from 'react-native-fast-image';
import { observer } from 'mobx-react-lite';
const Image = FastImage;

const remarkStyle = {color: currentTheme.textSecondary, textAlign: 'center', fontSize: 16, marginTop: 5}
const loadingScreenRemarks = [
    <Text style={remarkStyle}>I'm writing a complaint to the Head of Loading Screens.</Text>,
    <Text style={remarkStyle}>I don't think we can load any longer!</Text>,
    <Text style={remarkStyle}>Better grab a book or something.</Text>,
    <Text style={remarkStyle}>When will the madness end?</Text>,
    <Text style={remarkStyle}>You know, what does RVMob even stand for?</Text>
]
let selectedRemark = loadingScreenRemarks[Math.floor(Math.random() * loadingScreenRemarks.length)];

class MainView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        	username: null,
        	status: "tryingLogin",
        	currentChannel: null,
            currentText: "",
            tokenInput: "",
            userStatusInput: "",
            leftMenuOpen: false,
            rightMenuOpen: false,
            contextMenuMessage: null,
            contextMenuUser: null,
            contextMenuServer: null,
            inviteBot: null,
            inviteBotDestination: null,
            imageViewerImage: null,
            contextMenuUserProfile: null,
            inviteServer: null,
            inviteServerCode: "",
            settingsOpen: false,
            nsfwConsented: false,
            rerender: 0
        };
        console.log("construct app");
        setFunction("openProfile", async (u, s) => {
            this.setState({contextMenuUser: u || null, contextMenuUserProfile: u ? (await u.fetchProfile()) : null, contextMenuUserServer: s || null})
        })
        setFunction("openLeftMenu", async (o) => {
            this.setState(typeof o == 'boolean' ? {leftMenuOpen: o} : {leftMenuOpen: !this.state.leftMenuOpen})
        })
        setFunction("openRightMenu", async (o) => {
            this.setState(typeof o == 'boolean' ? {rightMenuOpen: o} : {rightMenuOpen: !this.state.rightMenuOpen})
        })
        setFunction("openInvite", async (i) => {
            this.setState({inviteServer: (await client.fetchInvite(i).catch(e => e)), inviteServerCode: i})
        })
        setFunction("openBotInvite", async (id) => {
            this.setState({inviteBot: (await client.bots.fetchPublic(id).catch(e => e))})
        })
        setFunction("openChannel", async (c) => {
            this.setState({currentChannel: c})
        })
        setFunction("openImage", async (a) => {
            this.setState({imageViewerImage: a})
        })
        setFunction("openServerContextMenu", async (s) => {
            this.setState({contextMenuServer: s})
        })
    }
    componentDidUpdate(_, prevState) {
        if (prevState.status != this.state.status && this.state.status == "tryingLogin")
        selectedRemark = loadingScreenRemarks[Math.floor(Math.random() * loadingScreenRemarks.length)];
    }
    async componentDidMount() {
        console.log("mount app")
        client.on('ready', (async () => {
            this.setState({status: "loggedIn", network: "ready"});
            if (this.state.tokenInput) {
                AsyncStorage.setItem('token', this.state.tokenInput)
                this.setState({tokenInput: ""})
            }
        }).bind(this));
        client.on('dropped', (async () => {
            this.setState({network: "dropped"});
        }).bind(this));
        AsyncStorage.getItem('token', async (err, res) => {
            if (!err) {
                if ((typeof res) != "string") {
                    this.setState({status: "awaitingLogin"})
                    return
                }
                try {
                    await client.useExistingSession({token: res});
                } catch (e) {
                    !(e.message.startsWith("Read error") || e.message === "Network Error") && client.user ?
                    this.setState({logInError: e, status: "awaitingLogin"}) : 
                    this.state.status == "loggedIn" ? this.setState({logInError: e}) : this.setState({logInError: e, status: "awaitingLogin"})
                }
            } else {
                console.log(err)
                this.setState({status: "awaitingLogin"});
            }
        });
    }
    render() {
        return (
            (this.state.status == "loggedIn" ? 
                <View style={styles.app}>
                    <SideMenu openMenuOffset={Dimensions.get('window').width - 50}
                    menuPosition="right" 
                    disableGestures={this.state.leftMenuOpen} 
                    overlayColor={"#00000040"}
                    edgeHitWidth={120} 
                    isOpen={this.state.rightMenuOpen} 
                    onChange={(open) => this.setState({rightMenuOpen: open})} 
                    menu={<RightMenu currentChannel={this.state.currentChannel} />} 
                    style={styles.app} 
                    bounceBackOnOverdraw={false}>
                        <SideMenu openMenuOffset={Dimensions.get('window').width - 50} 
                        disableGestures={this.state.rightMenuOpen} 
                        overlayColor={"#00000040"}
                        edgeHitWidth={120} 
                        isOpen={this.state.leftMenuOpen} 
                        onChange={(open) => this.setState({leftMenuOpen: open})} 
                        menu={<LeftMenu rerender={this.state.rerender} onOpenSettings={() => this.setState({settingsOpen: true})} onChannelClick={(s) => this.setState({currentChannel: s, leftMenuOpen: false, messages: []})} currentChannel={this.state.currentChannel} onLogOut={() => {AsyncStorage.setItem('token', ""); this.setState({status: "awaitingLogin"})}} />} 
                        style={styles.app} 
                        bounceBackOnOverdraw={false}>
                            <View style={styles.mainView}>
                                {this.state.currentChannel ? 
                                    (this.state.currentChannel == "friends" ?
                                    <View style={{flex: 1}}>
                                        <View style={styles.channelHeader}>
                                            <TouchableOpacity style={styles.headerIcon} onPress={() => {this.setState({leftMenuOpen: !this.state.leftMenuOpen})}}><Text>☰</Text></TouchableOpacity>
                                            <Text style={{flex: 1}}>{this.state.currentChannel?.channel_type != "Group" && (this.state.currentChannel?.channel_type == "DirectMessage" ? "@" : "#")}{this.state.currentChannel.name || this.state.currentChannel.recipient?.username}</Text>
                                        </View>
                                        <ScrollView style={{flex: 1}}>
                                            <Text style={{fontWeight: 'bold', margin: 5, marginLeft: 10, marginTop: 10}}>INCOMING REQUESTS</Text>
                                            <View>
                                                {[...client.users.values()].filter((x) => x.relationship === RelationshipStatus.Incoming).map(f => {
                                                    return <TouchableOpacity key={f._id} onPress={() => app.openProfile(f)} style={{justifyContent: 'center', margin: 6, padding: 6, backgroundColor: currentTheme.backgroundSecondary, borderRadius: 8}}>
                                                        <MiniProfile user={f} scale={1.15} />
                                                    </TouchableOpacity>
                                                })}
                                            </View>
                                            <Text style={{fontWeight: 'bold', margin: 5, marginLeft: 10, marginTop: 10}}>OUTGOING REQUESTS</Text>
                                            <View>
                                                {[...client.users.values()].filter((x) => x.relationship === RelationshipStatus.Outgoing).map(f => {
                                                    return <TouchableOpacity key={f._id} onPress={() => app.openProfile(f)} style={{justifyContent: 'center', margin: 6, padding: 6, backgroundColor: currentTheme.backgroundSecondary, borderRadius: 8}}>
                                                        <MiniProfile user={f} scale={1.15} />
                                                    </TouchableOpacity>
                                                })}
                                            </View>
                                            <Text style={{fontWeight: 'bold', margin: 5, marginLeft: 10}}>FRIENDS</Text>
                                            <View>
                                                {[...client.users.values()].filter((x) => x.relationship === RelationshipStatus.Friend).map(f => {
                                                    return <TouchableOpacity key={f._id} onPress={() => app.openProfile(f)} style={{flexDirection: "row", alignItems: 'center', margin: 8, padding: 4, backgroundColor: currentTheme.backgroundSecondary, borderRadius: 8}}>
                                                        <MiniProfile user={f} scale={1.15} />
                                                    </TouchableOpacity>
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>
                                    :
                                    <View style={{flex: 1}}>
                                        <View style={styles.channelHeader}>
                                            <TouchableOpacity style={styles.headerIcon} onPress={() => {this.setState({leftMenuOpen: !this.state.leftMenuOpen})}}><Text>☰</Text></TouchableOpacity>
                                            <Text style={{flex: 1}}>#{this.state.currentChannel.name}</Text>
                                        </View>
                                        {(!this.state.currentChannel?.nsfw || app.settings.get("Consented to 18+ content")) ?
                                        <>
                                            <Messages channel={this.state.currentChannel} onLongPress={async (m) => {this.setState({contextMenuMessage: m})}} onUserPress={(m) => {app.openProfile(m.author, this.state.currentChannel.server)}} onImagePress={(a) => {this.setState({imageViewerImage: a})}} rerender={this.state.rerender} onUsernamePress={(m) => this.setState({currentText: this.state.currentText + "<@" + m.author?._id + ">"})} />
                                            <MessageBox channel={this.state.currentChannel} />
                                        </>
                                        :
                                        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25}}>
                                            <Text style={{fontWeight: 'bold', fontSize: 28}}>Hold it!</Text>
                                            <Text style={{textAlign: 'center', fontSize: 16}}>This is an NSFW channel. Are you sure you want to enter?{'\n'}(This can be reversed in Settings)</Text>
                                            <TouchableOpacity style={styles.button} onPress={() => {app.settings.set("Consented to 18+ content", true); this.setState({})}}><Text style={{fontSize: 16}}>Enter</Text></TouchableOpacity>
                                        </View>
                                        }
                                    </View>
                                    )
                                    :
                                    <>
                                        <View style={styles.channelHeader}>
                                            <TouchableOpacity style={styles.headerIcon} onPress={() => {this.setState({leftMenuOpen: !this.state.leftMenuOpen})}}><Text>☰</Text></TouchableOpacity>
                                            <Text style={{flex: 1}}>Home</Text>
                                        </View>
                                        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20}}>
                                            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}} onPress={() => app.openProfile(client.user)}>
                                                <Avatar size={40} user={client.user} status />
                                                <View style={{marginLeft: 4}} />
                                                <Username size={20} user={client.user} />
                                            </TouchableOpacity>
                                            <Text key="app-name" style={{fontWeight: 'bold', fontSize: 48}}>RVMob</Text>
                                            <Text key="no-channel-selected" style={{textAlign: 'center', marginBottom: 10}}>Swipe from the left of the screen, or press the three lines icon to open the server selector!</Text>
                                            <TouchableOpacity style={styles.button} onPress={() => this.setState({settingsOpen: true})}>
                                                <Text style={{fontSize: 16}}>Settings</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.button} onPress={() => app.openInvite("Testers")}>
                                                <Text style={{fontSize: 16}}>Join Revolt Testers</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.button} onPress={() => app.openInvite("ZFGGw6ry")}>
                                                <Text style={{fontSize: 16}}>Join RVMob</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                }
                            </View>
                        </SideMenu>
                    </SideMenu>
                    <Modals state={this.state} setState={this.setState.bind(this)} />
                    <NetworkIndicator client={client} />
                </View>
                : 
                (this.state.status == "awaitingLogin" ? 
                <View style={styles.app}>
                    {/* <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
                        <Text style={{fontWeight: 'bold', fontSize: 48}}>RVMob</Text>
                        <TextInput placeholderTextColor={currentTheme.textSecondary} style={{borderRadius: 8, padding: 3, paddingLeft: 10, paddingRight: 10, margin: 8, width: "80%", backgroundColor: currentTheme.backgroundSecondary, color: currentTheme.textPrimary}} placeholder={"Email"} onChangeText={(text) => {
                            this.setState({emailInput: text})
                        }} value={this.state.emailInput} />
                        <TextInput placeholderTextColor={currentTheme.textSecondary} style={{borderRadius: 8, padding: 3, paddingLeft: 10, paddingRight: 10, margin: 8, width: "80%", backgroundColor: currentTheme.backgroundSecondary, color: currentTheme.textPrimary}} placeholder={"Password"} onChangeText={(text) => {
                            this.setState({passwordInput: text})
                        }} value={this.state.passwordInput} />
                        {this.state.logInError && <Text>{this.state.logInError.message}</Text>}
                        <TouchableOpacity onPress={async () => {
                            this.setState({status: "awaitingCaptcha"})
                        }} style={{borderRadius: 8, padding: 5, paddingLeft: 10, paddingRight: 10, backgroundColor: currentTheme.backgroundSecondary}}><Text>Log in</Text></TouchableOpacity>
                    </View> */}
                    <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
                        <Text style={{fontWeight: 'bold', fontSize: 48}}>RVMob</Text>
                        <TextInput placeholderTextColor={currentTheme.textSecondary} style={{borderRadius: 8, padding: 3, paddingLeft: 10, paddingRight: 10, margin: 8, width: "80%", backgroundColor: currentTheme.backgroundSecondary, color: currentTheme.textPrimary}} placeholder={"Token"} onChangeText={(text) => {
                            this.setState({tokenInput: text})
                        }} value={this.state.tokenInput} />
                        {this.state.logInError ? <Text>{this.state.logInError.message}</Text> : null}
                        <TouchableOpacity onPress={async () => {
                                this.setState({status: "tryingLogin"})
                            try {
                                await client.useExistingSession({token: this.state.tokenInput})
                                this.setState({status: "loggedIn", tokenInput: "", passwordInput: "", emailInput: "", logInError: null})
                            } catch (e) {
                                console.error(e)
                                this.setState({logInError: e, status: "awaitingLogin"})
                            }
                        }} style={{borderRadius: 8, padding: 5, paddingLeft: 10, paddingRight: 10, backgroundColor: currentTheme.backgroundSecondary}}><Text>Log in</Text></TouchableOpacity>
                    </View>
                </View>
                :
                this.state.status == "awaitingCaptcha" ? 
                    <View style={styles.app}>
                        <ConfirmHcaptcha siteKey={"3daae85e-09ab-4ff6-9f24-e8f4f335e433"} backgroundColor={currentTheme.backgroundPrimary} baseUrl={"https://app.revolt.chat"} onMessage={async e => {
                            if (!['cancel', 'error', 'expired'].includes(e.nativeEvent.data)) {
                                try {
                                    await client.login({email: this.state.emailInput, password: this.state.passwordInput, captcha: e.nativeEvent.data});
                                    //await client.useExistingSession({token: this.state.tokenInput})
                                    this.setState({status: "loggedIn", tokenInput: "", passwordInput: "", emailInput: "", logInError: null})
                                } catch (e) {
                                    console.error(e)
                                    !(e.message.startsWith("Read error") || e.message === "Network Error") && client.user ?
                                    this.setState({logInError: e, status: "awaitingLogin"}) : 
                                    this.state.status == "loggedIn" ? this.setState({logInError: e}) : this.setState({logInError: e, status: "awaitingLogin"})
                                }
                                return;
                            }
                        }} />
                    </View>
                :
                <View style={styles.app}>
                    <View style={styles.loggingInScreen}>
                        <Text style={{fontSize: 30, fontWeight: 'bold'}}>Logging in...</Text>
                        <View style={{paddingLeft: 30, paddingRight: 30}}>{selectedRemark || null}</View>
                    </View>
                </View>
                )
            )
        );
    }
}

export const NetworkIndicator = observer(({client}) => {
    if (!client.user?.online) {
        return <View style={{position: 'absolute', top: 0, left: 0, width: "100%", height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: currentTheme.accentColor}}>
            <Text style={{fontSize: 16, color: currentTheme.accentColorForeground}}>Connection lost</Text>
        </View>
    }
    return <></>;
})


export default class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            error: null
        }
    }
    componentDidCatch(error, errorInfo) {
        this.setState({error})
        console.error(error)
    }
    render() {
        return (
            <View style={styles.outer}>
                {this.state.error ?
                <Text style={{flex: 1, padding: 15, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 16, fontWeight: 'bold'}}>OOPSIE WOOPSIE!! Uwu We made a fucky wucky!! A wittle fucko boingo! The code monkeys at our headquarters are working VEWY HAWD to fix this!{'\n\n'}<Text style={{color: "#ff5555", fontWeight: 'regular'}}>{this.state.error.toString()}</Text></Text>
                :
                <>
                <StatusBar
                animated={true}
                backgroundColor={currentTheme.backgroundSecondary}
                barStyle={currentTheme.contentType + "-content"} />
                <MainView />
                </>}
            </View>
        );
    }
}