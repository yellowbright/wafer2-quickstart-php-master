//index.js
var qcloud = require('../../vendor/wafer2-client-sdk/index')
var config = require('../../config')
var util = require('../../utils/util.js')
// 显示繁忙提示
var showBusy = text => wx.showToast({
  title: text,
  icon: 'loading',
  duration: 10000
});

// 显示成功提示
var showSuccess = text => wx.showToast({
  title: text,
  icon: 'success'
});

// 显示失败提示
var showModel = (title, content) => {
  wx.hideToast();

  wx.showModal({
    title,
    content: JSON.stringify(content),
    showCancel: false
  });
};
Page({
    data: {
        userInfo: {},
        logged: false,
        takeSession: false,
        requestResult: '',
        loginUrl: config.service.loginUrl,
        requestUrl: config.service.requestUrl,
        tunnelUrl: config.service.tunnelUrl,
        uploadUrl: config.service.uploadUrl,
        tunnelStatus: 'closed',
        tunnelStatusText: {
          closed: '已关闭',
          connecting: '正在连接...',
          connected: '已连接'
        },
        imgUrl: ''
    },

    // 用户登录示例
    login: function() {
        if (this.data.logged) return

        util.showBusy('正在登录')
        var that = this

        // 调用登录接口
        qcloud.login({
            success(result) {
              console.log(result);
                if (result) {
                    util.showSuccess('登录成功')
                    that.setData({
                        userInfo: result,
                        logged: true
                    })
                } else {
                  console.log("不是首次登陆！");
                    // 如果不是首次登录，不会返回用户信息，请求用户信息接口获取
                    qcloud.request({
                        url: config.service.requestUrl,
                        login: true,
                        success(result) {
                            util.showSuccess('登录成功')
                            that.setData({
                                userInfo: result.data.data,
                                logged: true
                            })
                        },

                        fail(error) {
                          util.showSuccess('登录失败')
                            util.showModel('请求失败', error)
                            console.log('request fail', error)
                        }
                    })
                }
            },

            fail(error) {
                util.showModel('登录失败', error)
                // console.log('登录失败', error)
              wx.showModal({
                title: '警告',
                content: '您点击了拒绝授权,将无法正常显示个人信息,点击确定重新获取授权。',
                success: function (res) {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (res) => {
                        if (res.authSetting["scope.userInfo"]) {////如果用户重新同意了授权登录
                          wx.getUserInfo({
                            success: function (res) {
                              var userInfo = res.userInfo;
                              that.setData({
                                userInfo: userInfo,
                                logged: true
                              })
                            }
                          })
                        }
                      }, fail: function (res) {

                      }
                    })

                  }
                }
              })
            }
        })
    },

    // 切换是否带有登录态
    switchRequestMode: function (e) {
        this.setData({
            takeSession: e.detail.value
        })
        this.doRequest()
    },

    doRequest: function () {
        util.showBusy('请求中...')
        var that = this
        var options = {
            url: config.service.requestUrl,
            login: true,
            success (result) {
                util.showSuccess('请求成功完成')
                console.log('request success', result)
                that.setData({
                    requestResult: JSON.stringify(result.data)
                })
            },
            fail (error) {
                util.showModel('请求失败', error);
                console.log('request fail', error);
            }
        }
        if (this.data.takeSession) {  // 使用 qcloud.request 带登录态登录
            qcloud.request(options)
        } else {    // 使用 wx.request 则不带登录态
            wx.request(options)
        }
    },

    // 上传图片接口
    doUpload: function () {
        var that = this

        // 选择图片
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: function(res){
                util.showBusy('正在上传')
                var filePath = res.tempFilePaths[0]

                // 上传图片
                wx.uploadFile({
                    url: config.service.uploadUrl,
                    filePath: filePath,
                    name: 'file',

                    success: function(res){
                        util.showSuccess('上传图片成功')
                        res = JSON.parse(res.data)
                        that.setData({
                            imgUrl: res.data.imgUrl
                        })
                    },

                    fail: function(e) {
                        util.showModel('上传图片失败')
                    }
                })

            },
            fail: function(e) {
                console.error(e)
            }
        })
    },

    // 预览图片
    previewImg: function () {
        wx.previewImage({
            current: this.data.imgUrl,
            urls: [this.data.imgUrl]
        })
    },

    /**
     * 测试公共construct接口
     * @author dimple<34576804@qq.com>
     * @datetime 2018-04-12
     * @return {[type]}
     */
    testBase: function () {
        util.showBusy('请求中...')
        var that = this
        qcloud.request({
          url: 'https://wqmki0uo.qcloud.la/weapp/message?echostr=hahaha',
            login: false,
            data: {
              lala:"haha"
            },
            success (result) {
                console.log(result);
                util.showSuccess('请求成功完成')
                that.setData({
                    requestResult: JSON.stringify(result.data)
                })
            },
            fail (error) {
                util.showModel('请求失败', error);
                console.log('request fail', error);
            }
        })
    },

    switchTunnel(e) {
      const turnedOn = e.detail.value;

      if (turnedOn && this.data.tunnelStatus == 'closed') {
        this.openTunnel();

      } else if (!turnedOn && this.data.tunnelStatus == 'connected') {
        this.closeTunnel();
      }
    },

    /**
 * 点击「打开信道」，测试 WebSocket 信道服务
 */
    openTunnel() {
      // 创建信道，需要给定后台服务地址
      var tunnel = this.tunnel = new qcloud.Tunnel(this.data.tunnelUrl);

      // 监听信道内置消息，包括 connect/close/reconnecting/reconnect/error
      tunnel.on('connect', () => {
        console.log('WebSocket 信道已连接');
        this.setData({ tunnelStatus: 'connected' });
      });

      tunnel.on('close', () => {
        console.log('WebSocket 信道已断开');
        this.setData({ tunnelStatus: 'closed' });
      });

      tunnel.on('reconnecting', () => {
        console.log('WebSocket 信道正在重连...')
        showBusy('正在重连');
      });

      tunnel.on('reconnect', () => {
        console.log('WebSocket 信道重连成功')
        showSuccess('重连成功');
      });

      tunnel.on('error', error => {
        showModel('信道发生错误', error);
        console.error('信道发生错误：', error);
      });

      // 监听自定义消息（服务器进行推送）
      tunnel.on('speak', speak => {
        showModel('信道消息', speak);
        console.log('收到说话消息：', speak);
      });

      // 打开信道
      tunnel.open();

      this.setData({ tunnelStatus: 'connecting' });
    },

    /**
     * 点击「发送消息」按钮，测试使用信道发送消息
     */
    sendMessage() {
      // 使用 tunnel.isActive() 来检测当前信道是否处于可用状态
      if (this.tunnel && this.tunnel.isActive()) {
        // 使用信道给服务器推送「speak」消息
        this.tunnel.emit('speak', {
          'word': 'I say something at ' + new Date(),
        });
      }
    },

    /**
     * 点击「测试重连」按钮，测试重连
     * 也可以断开网络一段时间之后再连接，测试重连能力
     */
    testReconnect() {
      // 不通过 SDK 关闭连接，而是直接用微信断开来模拟连接断开的情况下，考察 SDK 自动重连的能力
      wx.closeSocket();
    },

    /**
     * 点击「关闭信道」按钮，关闭已经打开的信道
     */
    closeTunnel() {
      if (this.tunnel) {
        this.tunnel.close();
      }

      this.setData({ tunnelStatus: 'closed' });
    },

    /**
     * 点击「聊天室」按钮，跳转到聊天室综合 Demo 的页面
     */
    openChat() {
      // 微信只允许一个信道再运行，聊天室使用信道前，我们先把当前的关闭
      this.closeTunnel();
      //测试传值
      var open_id_with ="oARoJ48YNr-ME52Etjf53m1tF3yo";
      wx.navigateTo({ url: '../chat/chat?open_id_with='+open_id_with });
    },
})
