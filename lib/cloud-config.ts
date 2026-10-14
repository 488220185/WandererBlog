/**
 * WorkBuddy 云服务公开配置。
 * 这四个值来自 workbuddy_cloud_service 返回的 publicConfig，
 * 是唯一允许出现在前端代码里的配置。endpoint 与 publishableKey 必填，
 * oauthRelayBaseUrl 供微信网页登录使用。
 */
export const publicConfig = {
  resourceId: 'wbcs_IKQCJiNXIHHzUOY3JcznXN',
  endpoint: 'https://dev-notes-blog-23897.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey:
    'wbpk_D2sZRRlKM1e4roUd642xwo_RGyJ5ws5fCD5WYj9LUelJNoiEtf7C2gY',
}
