/**
 * 常量定义模块
 * 包含预置分类、预置账户、预置关键词规则、色彩体系等
 */

// ─── 色彩体系（马卡龙萌系） ───
const COLORS = {
  primary: '#F8BBD0',       // 樱花粉 - TabBar选中、FAB、关键按钮
  secondary: '#B2EBF2',     // 薄荷蓝 - 分类图标背景、卡片辅助底色
  tertiary: '#FFF9C4',      // 鹅黄 - AI建议气泡、高亮标签
  expense: '#FF8A80',       // 蜜桃红 - 支出金额、超支标记
  income: '#A5D6A7',        // 薄荷绿 - 收入金额
  bg: '#FFF5F7',            // 暖粉白 - 全页背景
  card: '#FFFFFE',          // 近白 - 卡片底色
  textPrimary: '#5D4037',   // 深咖 - 标题和大数字
  textSecondary: '#8D6E63', // 浅咖 - 副标题、备注、时间戳
  divider: '#F0E6E8'        // 淡粉灰 - 列表分割
}

// ─── 预置分类（10个） ───
const PRESET_CATEGORIES = [
  { id: 'cat_001', name: '餐饮', emoji: '🍔', isPreset: true, sortOrder: 1 },
  { id: 'cat_002', name: '交通', emoji: '🚇', isPreset: true, sortOrder: 2 },
  { id: 'cat_003', name: '购物', emoji: '🛍️', isPreset: true, sortOrder: 3 },
  { id: 'cat_004', name: '娱乐', emoji: '🎮', isPreset: true, sortOrder: 4 },
  { id: 'cat_005', name: '医疗', emoji: '💊', isPreset: true, sortOrder: 5 },
  { id: 'cat_006', name: '教育', emoji: '📚', isPreset: true, sortOrder: 6 },
  { id: 'cat_007', name: '居住', emoji: '🏠', isPreset: true, sortOrder: 7 },
  { id: 'cat_008', name: '服饰', emoji: '👗', isPreset: true, sortOrder: 8 },
  { id: 'cat_009', name: '通讯', emoji: '📱', isPreset: true, sortOrder: 9 },
  { id: 'cat_010', name: '其他', emoji: '📦', isPreset: true, sortOrder: 10 }
]

// ─── 预置账户（4个） ───
const PRESET_ACCOUNTS = [
  { id: 'acct_001', name: '微信零钱', emoji: '💳', isPreset: true },
  { id: 'acct_002', name: '微信银行卡', emoji: '🏦', isPreset: true },
  { id: 'acct_003', name: '现金', emoji: '💵', isPreset: true },
  { id: 'acct_004', name: '其他', emoji: '💰', isPreset: true }
]

// ─── 预置关键词映射规则 ───
const PRESET_RULES = [
  // 餐饮
  { id: 'rule_001', keyword: '麦当劳', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_002', keyword: '肯德基', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_003', keyword: '美团', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_004', keyword: '饿了么', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_005', keyword: '星巴克', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_006', keyword: '瑞幸', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_007', keyword: '喜茶', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_008', keyword: '奈雪', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_009', keyword: '食堂', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_010', keyword: '餐厅', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_011', keyword: '饭店', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_012', keyword: '火锅', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_013', keyword: '奶茶', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_014', keyword: '咖啡', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_015', keyword: '外卖', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_016', keyword: '零食', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_017', keyword: '水果', categoryId: 'cat_001', isPreset: true, enabled: true },
  { id: 'rule_018', keyword: '超市', categoryId: 'cat_001', isPreset: true, enabled: true },
  // 交通
  { id: 'rule_019', keyword: '滴滴', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_020', keyword: '地铁', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_021', keyword: '公交', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_022', keyword: '铁路', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_023', keyword: '高铁', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_024', keyword: '飞机', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_025', keyword: '加油', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_026', keyword: '停车', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_027', keyword: 'ETC', categoryId: 'cat_002', isPreset: true, enabled: true },
  { id: 'rule_028', keyword: '火车', categoryId: 'cat_002', isPreset: true, enabled: true },
  // 购物
  { id: 'rule_029', keyword: '淘宝', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_030', keyword: '天猫', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_031', keyword: '京东', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_032', keyword: '拼多多', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_033', keyword: '唯品会', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_034', keyword: '百货', categoryId: 'cat_003', isPreset: true, enabled: true },
  { id: 'rule_035', keyword: '商场', categoryId: 'cat_003', isPreset: true, enabled: true },
  // 娱乐
  { id: 'rule_036', keyword: '电影院', categoryId: 'cat_004', isPreset: true, enabled: true },
  { id: 'rule_037', keyword: 'KTV', categoryId: 'cat_004', isPreset: true, enabled: true },
  { id: 'rule_038', keyword: '游戏', categoryId: 'cat_004', isPreset: true, enabled: true },
  { id: 'rule_039', keyword: '景区', categoryId: 'cat_004', isPreset: true, enabled: true },
  { id: 'rule_040', keyword: '门票', categoryId: 'cat_004', isPreset: true, enabled: true },
  { id: 'rule_041', keyword: '酒店', categoryId: 'cat_004', isPreset: true, enabled: true },
  // 医疗
  { id: 'rule_042', keyword: '药店', categoryId: 'cat_005', isPreset: true, enabled: true },
  { id: 'rule_043', keyword: '医院', categoryId: 'cat_005', isPreset: true, enabled: true },
  { id: 'rule_044', keyword: '诊所', categoryId: 'cat_005', isPreset: true, enabled: true },
  { id: 'rule_045', keyword: '药房', categoryId: 'cat_005', isPreset: true, enabled: true },
  // 教育
  { id: 'rule_046', keyword: '书店', categoryId: 'cat_006', isPreset: true, enabled: true },
  { id: 'rule_047', keyword: '培训', categoryId: 'cat_006', isPreset: true, enabled: true },
  { id: 'rule_048', keyword: '课程', categoryId: 'cat_006', isPreset: true, enabled: true },
  { id: 'rule_049', keyword: '学费', categoryId: 'cat_006', isPreset: true, enabled: true },
  // 居住
  { id: 'rule_050', keyword: '房租', categoryId: 'cat_007', isPreset: true, enabled: true },
  { id: 'rule_051', keyword: '物业', categoryId: 'cat_007', isPreset: true, enabled: true },
  { id: 'rule_052', keyword: '水电', categoryId: 'cat_007', isPreset: true, enabled: true },
  { id: 'rule_053', keyword: '燃气', categoryId: 'cat_007', isPreset: true, enabled: true },
  { id: 'rule_054', keyword: '暖气', categoryId: 'cat_007', isPreset: true, enabled: true },
  // 服饰
  { id: 'rule_055', keyword: '服装', categoryId: 'cat_008', isPreset: true, enabled: true },
  { id: 'rule_056', keyword: '鞋', categoryId: 'cat_008', isPreset: true, enabled: true },
  { id: 'rule_057', keyword: '包', categoryId: 'cat_008', isPreset: true, enabled: true },
  // 通讯
  { id: 'rule_058', keyword: '话费', categoryId: 'cat_009', isPreset: true, enabled: true },
  { id: 'rule_059', keyword: '宽带', categoryId: 'cat_009', isPreset: true, enabled: true },
  { id: 'rule_060', keyword: '流量', categoryId: 'cat_009', isPreset: true, enabled: true }
]

// ─── 支出方向：关键词 → 判定为"支出" ───
const EXPENSE_KEYWORDS = ['消费', '支付', '扣款', '付款', '扫码', '刷卡', '转账']

// ─── 收入方向：关键词 → 判定为"收入" ───
const INCOME_KEYWORDS = ['收款', '转入', '退款', '到账', '退回', '红包', '转账收入', '收入', '工资']

// ─── 微信支付通知场景值范围 ───
const FORWARD_SCENE_VALUES = [1037, 1038, 1043]

// ─── 应用配置默认值 ───
const DEFAULT_APP_CONFIG = {
  aiMode: 'local',          // 'local' | 'cloud'
  apiKey: null,             // 加密存储
  aiModel: null,            // 模型标识
  hasSeenGuide: false,      // 是否已看转发引导
  lastExportDate: null,     // 最近导出时间戳
  theme: 'light'            // 固定浅色
}

// ─── 去重时间窗口（毫秒） ───
const DEDUP_WINDOW_MS = 10 * 1000

// ─── 分页大小 ───
const PAGE_SIZE = 20

module.exports = {
  COLORS,
  PRESET_CATEGORIES,
  PRESET_ACCOUNTS,
  PRESET_RULES,
  EXPENSE_KEYWORDS,
  INCOME_KEYWORDS,
  FORWARD_SCENE_VALUES,
  DEFAULT_APP_CONFIG,
  DEDUP_WINDOW_MS,
  PAGE_SIZE
}
