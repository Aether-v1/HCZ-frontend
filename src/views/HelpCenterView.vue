<template>
  <section class="help-v2-page stack-lg help-center-public-page">
    <div class="card help-v2-hero">
      <div class="help-v2-hero-main">
        <h1>帮助中心</h1>
        <div class="help-public-actions help-v2-actions">
          <a class="ghost-btn help-public-btn" href="/login">登录</a>
          <a class="primary-btn help-public-btn" href="/register">注册</a>
        </div>
      </div>

      <label class="help-v2-search">
        <input v-model.trim="keyword" type="text" placeholder="搜索问题或关键词" autocomplete="off" />
      </label>
    </div>

    <div v-if="!keyword" class="help-v2-category-grid">
      <button
        v-for="category in categoryNav"
        :key="category.id"
        type="button"
        class="card help-v2-category-card"
        @click="scrollToCategory(category.id)"
      >
        <div class="help-v2-category-top">
          <AppGlyph :name="category.glyph" :variant="category.variant" />
          <span class="help-v2-count">{{ category.count }}</span>
        </div>
        <strong>{{ category.title }}</strong>
        <span class="muted">{{ category.subtitle }}</span>
      </button>
    </div>

    <div v-if="!filteredCategories.length" class="card help-v2-empty">
      <strong>没有找到相关内容</strong>
      <p class="muted">换个关键词试试，比如：订单、USDT、代理、售后。</p>
    </div>

    <div v-for="category in filteredCategories" :key="category.id" :id="category.id" class="card help-v2-section">
      <div class="help-v2-section-head">
        <AppGlyph :name="category.glyph" :variant="category.variant" />
        <div>
          <h2>{{ category.title }}</h2>
          <p class="muted">{{ category.subtitle }}</p>
        </div>
      </div>

      <div class="help-v2-faq-list">
        <article v-for="item in category.items" :key="item.id" class="help-v2-faq-item">
          <button type="button" class="help-v2-question" @click="toggleItem(item.id)">
            <span>{{ item.question }}</span>
            <span class="help-v2-arrow" :class="{ open: isOpen(item.id) }">⌄</span>
          </button>

          <div v-if="isOpen(item.id)" class="help-v2-answer">
            <template v-for="(block, index) in item.blocks" :key="`${item.id}-${index}`">
              <p v-if="block.type === 'text'">{{ block.text }}</p>
              <div v-else-if="block.type === 'lines'" class="help-v2-lines">
                <p v-for="(line, lineIndex) in block.items" :key="`${item.id}-line-${lineIndex}`">{{ line }}</p>
              </div>
              <ul v-else-if="block.type === 'bullets'" class="help-v2-bullets">
                <li v-for="(line, lineIndex) in block.items" :key="`${item.id}-bullet-${lineIndex}`">{{ line }}</li>
              </ul>
              <ol v-else-if="block.type === 'steps'" class="help-v2-steps">
                <li v-for="(line, lineIndex) in block.items" :key="`${item.id}-step-${lineIndex}`">{{ line }}</li>
              </ol>
              <p v-else-if="block.type === 'note'" class="help-v2-note">{{ block.text }}</p>
              <img
                v-else-if="block.type === 'image'"
                class="help-v2-image"
                :src="resolveAssetUrl(block.src)"
                :alt="block.alt || item.question"
                loading="lazy"
              />
              <p v-else-if="block.type === 'caption'" class="help-v2-caption">{{ block.text }}</p>
            </template>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppGlyph from '../components/AppGlyph.vue'
import { resolveAssetUrl } from '../utils/assets'

defineOptions({ name: 'HelpCenterView' })

const keyword = ref('')
const openIds = ref(new Set(['account-profile', 'order-status']))

const helpCategories = [
  {
    id: 'account',
    title: '账户相关',
    subtitle: '资料、账号与邀请码说明',
    glyph: 'settings',
    variant: 'blue',
    items: [
      {
        id: 'account-profile',
        question: '如何修改个人信息？',
        blocks: [
          { type: 'steps', items: ['点击底部导航栏的“我的”。', '进入“账户设置”。', '点击“个人资料”进行修改。', '修改完成后点击“保存”即可。'] }
        ]
      },
      {
        id: 'account-change',
        question: '如何更换绑定账号？',
        blocks: [{ type: 'text', text: '当前注册账号不支持直接更换，如需处理请联系平台客服核实。' }]
      },
      {
        id: 'account-invite-code',
        question: '邀请码是什么？',
        blocks: [{ type: 'text', text: '邀请码在注册页面由推荐人提供，填写后可享受对应优惠。' }]
      }
    ]
  },
  {
    id: 'order',
    title: '订单问题',
    subtitle: '订单状态、取消与拆分处理',
    glyph: 'market',
    variant: 'purple',
    items: [
      {
        id: 'order-status',
        question: '如何查询我的订单状态？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '在“我的”页面点击“订单列表”查看全部订单。',
              '待充值：已支付，订单等待处理。',
              '充值中：订单正在处理中。',
              '已完成：订单已成功处理。',
              '已取消：订单已取消。'
            ]
          }
        ]
      },
      {
        id: 'order-cancel',
        question: '订单可以取消吗？如何取消？',
        blocks: [
          {
            type: 'lines',
            items: ['待充值状态可在订单页面内取消。', '充值中状态无法取消订单。']
          }
        ]
      },
      {
        id: 'order-split',
        question: '订单被拆分充值时如何处理？',
        blocks: [
          {
            type: 'steps',
            items: [
              '若您的订单被拆分充值，例如 500 的订单仅充值 400，剩余 100 长时间未到账，可发起取消。',
              '提交 500 及以上金额的订单，即使部分充值，例如已充值 300、剩余 200 未充值，已充值部分仍按 8 折结算。',
              '取消订单后，未充值部分会自动返还至您的账户余额。'
            ]
          },
          { type: 'note', text: '此规则可帮助您更快回笼资金，再重新提交新订单。' }
        ]
      }
    ]
  },
  {
    id: 'balance-recharge',
    title: '余额问题',
    subtitle: 'USDT 地址、购买、提币与平台充值',
    glyph: 'wallet',
    variant: 'green',
    items: [
      {
        id: 'wallet-address-guide',
        question: '交易所查看 USDT 钱包地址教程（提币/充值必备）',
        blocks: [
          { type: 'text', text: '以下以欧易交易所为例，其他交易所流程基本相同：' },
          { type: 'steps', items: ['登录后点击底部菜单栏“资产”→“充币”→ 选择 USDT-Tron（TRC20）。', '页面会显示 USDT 充值地址，点击复制保存。建议手动核对 1-2 遍地址，避免复制错误。'] },
          { type: 'image', src: '/help-assets/31.JPG', alt: '欧易查看USDT钱包地址操作界面' },
          { type: 'caption', text: '图：欧易交易所查看 USDT 钱包地址操作界面' }
        ]
      },
      {
        id: 'wallet-buy-usdt',
        question: '交易所购买 USDT 教程',
        blocks: [
          { type: 'text', text: '以下以欧易交易所为例，其他交易所流程基本相同：' },
          {
            type: 'steps',
            items: [
              '登录后点击首页“C2C”，新手优先选法币交易，用人民币直接购买。',
              '进入法币交易页后选择“购买”并选择币种“USDT”。',
              '按支付方式筛选商家，优先选择成交量大、好评率高的商家。',
              '输入需要购买的金额，例如 500 元，点击“立即购买”。',
              '跳转订单页后，按商家提示完成付款，再点击“我已付款”。',
              '等待商家确认收款后，USDT 会自动发放至现货钱包。'
            ]
          }
        ]
      },
      {
        id: 'wallet-withdraw-usdt',
        question: '欧易提币 USDT 教程（提至外部平台/钱包）',
        blocks: [
          {
            type: 'steps',
            items: [
              '登录后点击“钱包”→“现货”，找到 USDT，点击“提币”。',
              '选择链类型，必须与接收方平台的 USDT 链保持一致，错链无法到账。',
              '填写提币地址，粘贴接收方平台提供的钱包地址，建议核对前 4 位和后 4 位。',
              '填写提币数量，公式为：提币数量 = 目标到账数量 + 交易所手续费。',
              '核对页面显示的“实际到账数量”，确认与目标到账数量一致。',
              '完成短信/谷歌验证后提交提币申请。',
              '提币成功后，在提币记录中截图保存，后续平台充值可能需要上传。'
            ]
          }
        ]
      },
      {
        id: 'wallet-platform-recharge',
        question: '外部平台充值 USDT（对接交易所提币）',
        blocks: [
          { type: 'text', text: '充值前，请先完成交易所提币申请，并等待状态显示为“提币成功”。' },
          {
            type: 'steps',
            items: [
              '登录平台，点击“我的”进入“充值提现”页面。',
              '如为首次充值，先绑定自己的 USDT 钱包地址。',
              '返回充值页，输入需要充值的 USDT 数量并确认。',
              '页面会生成平台收款地址和上传凭证页，先复制该地址。',
              '回到交易所，按提币教程完成提币，提币地址填写刚复制的平台地址。',
              '提币成功后，截图保存交易所提币记录。',
              '回到平台上传凭证页，上传截图后点击“已汇款”。',
              '等待系统或人工审核，审核通过后 USDT 会到账平台账户。'
            ]
          },
          {
            type: 'bullets',
            items: [
              '若审核失败，优先检查实际到账数量是否与充值数量一致。',
              '若到账数量正确但仍审核失败，请联系平台客服并提供提币截图和平台地址。'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'project-recharge',
    title: '项目事项',
    subtitle: '支持范围、售后与防骗提醒',
    glyph: 'service',
    variant: 'orange',
    items: [
      {
        id: 'project-number-types',
        question: '哪些类型的号码不支持充值？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '副卡、集团号、公司号。',
              '一卡多号、虚拟号、空号、错号。',
              '停机号、欠费号、广电号。'
            ]
          },
          { type: 'note', text: '特别说明：携号转网号码可以正常充值。' }
        ]
      },
      {
        id: 'project-after-sale',
        question: '订单售后有时间限制吗？',
        blocks: [
          { type: 'lines', items: ['所有订单售后有效期为 5 天，请在订单完成后 5 天内及时反馈问题。', '超时反馈将不予处理，请务必及时反馈售后问题。'] }
        ]
      },
      {
        id: 'project-requirements',
        question: '充值时有哪些必要要求？',
        blocks: [
          { type: 'lines', items: ['充值时请务必提供正确的缴费户号等平台要求的信息，确保资料准确无误。', '售后说明：充值到账即算完成，无售后服务。'] }
        ]
      },
      {
        id: 'project-anti-fraud',
        question: '如何防范诈骗？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '如遇陌生人以“多充”“错充”等理由，引导您点击链接或转账的，一律拉黑处理。',
              '平台不会主动联系客户要求操作充值或转账。',
              '因轻信此类诈骗造成的经济损失，平台概不负责。'
            ]
          }
        ]
      },
      {
        id: 'project-forbidden',
        question: '充值期间有哪些禁忌？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '不要让客户自行充值，也不要通过其他渠道充值。',
              '不要为副卡充值。',
              '如需更换渠道充值，必须先撤单并确认退款成功后再操作。',
              '充值期间在其他渠道操作导致的返销问题，不予售后。',
              '如出现争议，以本系统到账记录为准。'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'agent',
    title: '代理相关',
    subtitle: '代理权益、返佣与规范',
    glyph: 'agent',
    variant: 'red',
    items: [
      {
        id: 'agent-self-use',
        question: '仅自用需要开通代理吗？',
        blocks: [{ type: 'text', text: '若您仅需自用，无需发展代理，直接通过首页充值即可，享受的折扣权益与代理一致。' }]
      },
      {
        id: 'agent-open',
        question: '如何成为代理并发展下级？',
        blocks: [{ type: 'text', text: '若您计划发展代理，可免费开通专属邀请码，开通后可享受旗下十级代理的充值分佣权益。' }]
      },
      {
        id: 'agent-substation-what',
        question: '分站是什么？开通后能做什么？',
        blocks: [{ type: 'text', text: '分站是独立的代理经营入口。开通后可维护分站资料、设置档位价格、查看分站收益流水。' }]
      },
      {
        id: 'agent-substation-open',
        question: '分站如何开通？',
        blocks: [
          {
            type: 'steps',
            items: [
              '先在“权益中心”完成 SVIP 支付开通。',
              '支付完成后，再进入“分站中心”提交开通资料。',
              '资料审核通过后，分站功能即可正常使用。'
            ]
          }
        ]
      },
      {
        id: 'agent-substation-edit',
        question: '分站开通后可以修改资料吗？',
        blocks: [{ type: 'text', text: '可以。分站开通后可随时进入“分站中心”修改分站资料，提交后按系统审核流程生效。' }]
      },
      {
        id: 'agent-profit-rate',
        question: '代理分佣比例是多少？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '一级代理：每充值 10000U，返还 100U。',
              '二级代理：每充值 10000U，返还 50U。',
              '三级代理：每充值 10000U，返还 40U。',
              '四级代理：每充值 10000U，返还 30U。',
              '五级代理：每充值 10000U，返还 30U。',
              '六级至十级代理：按上述规则类推。'
            ]
          }
        ]
      },
      {
        id: 'agent-freeze-mode',
        question: '什么是代理返佣后付费解冻模式？',
        blocks: [
          {
            type: 'steps',
            items: [
              '邀请码开通后可先免费开展代理招募。',
              '旗下代理充值产生的返佣会正常累积，但初始不可直接使用。',
              '如需启用已累积的返佣，只需支付 100U 完成解冻。',
              '该模式能降低前期投入压力，可在返佣累积到合适金额后再解冻。'
            ]
          }
        ]
      },
      {
        id: 'agent-multi-account',
        question: '是否可以注册小号获取佣金？',
        blocks: [{ type: 'text', text: '禁止注册小号获取佣金，发现一律封号。平台会通过技术手段监测异常账号行为，违规后不予解封。' }]
      },
      {
        id: 'agent-price',
        question: '批量充值可以申请更低价格吗？',
        blocks: [{ type: 'text', text: '公司坚持统一标准，所有代理的充值折扣与分佣点位一致，暂不支持单独申请更低价格。' }]
      }
    ]
  },
  {
    id: 'business',
    title: '业务拓展',
    subtitle: '客户开发、推广与团队管理',
    glyph: 'official',
    variant: 'blue',
    items: [
      {
        id: 'business-new-customers',
        question: '如何有效开发新客户并拓展业务？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '识别目标人群，聚焦话费和电费充值需求旺盛的客户。',
              '通过专业解答与稳定服务建立信任关系。',
              '建立微信群或QQ群，定期分享优惠与充值常识。',
              '设计转介绍激励机制，带动老客户推荐新客户。',
              '定期回访客户，了解需求变化并提供个性化建议。'
            ]
          }
        ]
      },
      {
        id: 'business-phone-demand',
        question: '话费充值的主要刚需人群有哪些？',
        blocks: [
          {
            type: 'bullets',
            items: ['外卖配送员。', '快递员。', '销售人员。', '旅游公司职员。', '客服人员。', '大学生群体。']
          }
        ]
      },
      {
        id: 'business-electricity-demand',
        question: '电费充值的主要刚需人群有哪些？',
        blocks: [
          {
            type: 'bullets',
            items: ['各类店铺老板。', '小区业主。', '工厂老板。', '租房群体。', '中小企业。']
          }
        ]
      },
      {
        id: 'business-retention',
        question: '如何维护老客户，提高复购率？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '建立客户档案，记录充值习惯、金额与周期。',
              '设置会员等级制度，高等级用户可享更多优惠。',
              '在节日发送祝福和专属优惠。',
              '在历史充值周期前主动提醒，降低遗忘流失。',
              '对充值问题快速响应，提升满意度。'
            ]
          }
        ]
      },
      {
        id: 'business-channels',
        question: '有哪些高效的业务推广渠道？',
        blocks: [
          {
            type: 'bullets',
            items: [
              '线下推广：商圈、社区、写字楼派发宣传资料。',
              '社群营销：在业主群、行业群分享优惠，避免过度刷屏。',
              '朋友圈运营：定期发布充值案例与活动信息。',
              '异业合作：与高消耗商家合作互相引流。',
              '短视频推广：制作简单教程和活动视频，吸引年轻群体。'
            ]
          }
        ]
      },
      {
        id: 'business-team',
        question: '如何组建和管理销售团队拓展业务？',
        blocks: [
          {
            type: 'bullets',
            items: ['明确分工，按区域或客户类型划分负责范围。', '建立培训体系，定期进行产品与销售技巧培训。', '设置阶梯式激励机制。', '每周或每月复盘成果，持续优化策略。', '组织成功案例分享，促进团队共同进步。']
          }
        ]
      }
    ]
  }
]

const filteredCategories = computed(() => {
  const search = keyword.value.toLowerCase()
  return helpCategories
    .map((category) => {
      if (!search) return category
      const items = category.items.filter((item) => {
        const haystack = [item.question]
          .concat(item.blocks.flatMap((block) => (Array.isArray(block.items) ? block.items : [block.text || ''])))
          .join(' ')
          .toLowerCase()
        return haystack.includes(search)
      })
      return { ...category, items }
    })
    .filter((category) => category.items.length)
})

const categoryNav = computed(() =>
  helpCategories.map((category) => ({
    id: category.id,
    title: category.title,
    subtitle: category.subtitle,
    glyph: category.glyph,
    variant: category.variant,
    count: category.items.length
  }))
)

function toggleItem(id) {
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

function isOpen(id) {
  return openIds.value.has(id)
}

function scrollToCategory(id) {
  const target = document.getElementById(id)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.help-v2-page {
  width: min(1080px, 100%);
  margin: 0 auto;
}

.help-v2-hero {
  padding: 22px;
  display: grid;
  gap: 16px;
}

.help-v2-hero-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.help-v2-hero-main h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
}

.help-v2-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.help-v2-search {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 14px 16px;
}

.help-v2-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
}

.help-v2-category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.help-v2-category-card {
  border: 1px solid var(--line);
  padding: 18px;
  text-align: left;
  display: grid;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.help-v2-category-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-soft);
  box-shadow: 0 14px 30px rgba(6, 12, 24, 0.16);
}

.help-v2-category-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.help-v2-count {
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  font-size: 12px;
  border: 1px solid var(--line);
}

.help-v2-empty {
  padding: 22px;
}

.help-v2-section {
  padding: 22px;
  scroll-margin-top: 88px;
}

.help-v2-section-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.help-v2-section-head h2 {
  margin: 0;
}

.help-v2-section-head p {
  margin: 4px 0 0;
}

.help-v2-faq-list {
  display: grid;
  gap: 12px;
}

.help-v2-faq-item {
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.help-v2-question {
  width: 100%;
  background: transparent;
  border: 0;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.help-v2-arrow {
  transition: transform 0.2s ease;
  color: var(--muted);
}

.help-v2-arrow.open {
  transform: rotate(180deg);
}

.help-v2-answer {
  padding: 0 18px 18px;
  color: var(--text-soft);
  line-height: 1.8;
}

.help-v2-answer > :first-child {
  margin-top: 0;
}

.help-v2-answer p {
  margin: 10px 0;
}

.help-v2-lines,
.help-v2-bullets,
.help-v2-steps {
  margin: 10px 0;
}

.help-v2-bullets,
.help-v2-steps {
  padding-left: 20px;
}

.help-v2-bullets li,
.help-v2-steps li {
  margin: 8px 0;
}

.help-v2-note {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(99, 179, 255, 0.2);
  background: rgba(46, 125, 255, 0.08);
  color: var(--text);
}

.help-v2-image {
  display: block;
  width: min(440px, 100%);
  margin: 12px 0 0;
  border-radius: 16px;
  border: 1px solid var(--line);
}

.help-v2-caption {
  margin-top: 8px;
  font-size: 13px;
  color: var(--muted);
}

@media (max-width: 860px) {
  .help-v2-category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .help-v2-hero-main {
    align-items: center;
  }

  .help-v2-hero-main h1 {
    font-size: 28px;
  }

  .help-v2-actions {
    gap: 8px;
  }

  .help-public-btn {
    min-width: 86px;
    padding: 10px 16px;
  }
}

@media (max-width: 560px) {
  .help-v2-hero {
    padding: 18px 14px;
  }

  .help-v2-hero-main {
    gap: 10px;
  }

  .help-v2-hero-main h1 {
    font-size: 24px;
  }

  .help-v2-actions {
    gap: 8px;
  }

  .help-public-btn {
    min-width: 72px;
    padding: 8px 12px;
    font-size: 14px;
  }
}

@media (max-width: 640px) {
  .help-v2-hero,
  .help-v2-section,
  .help-v2-empty {
    padding: 16px;
  }

  .help-v2-hero-main {
    flex-direction: column;
  }

  .help-v2-actions {
    width: 100%;
  }

  .help-v2-category-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .help-v2-category-card {
    padding: 14px;
    border-radius: 18px;
  }

  .help-v2-question {
    padding: 14px 14px;
    font-size: 14px;
  }

  .help-v2-answer {
    padding: 0 14px 14px;
  }
}
</style>
