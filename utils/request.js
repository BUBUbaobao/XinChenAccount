/**
 * wx.request Promise 封装
 */
const DEFAULT_TIMEOUT = 15000

function request(options) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: options.url,
      method: options.method || 'POST',
      data: options.data || {},
      header: Object.assign({
        'Content-Type': 'application/json'
      }, options.header || {}),
      timeout: options.timeout || DEFAULT_TIMEOUT,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    }
    wx.request(opts)
  })
}

module.exports = { request }
