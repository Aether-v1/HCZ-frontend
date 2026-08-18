<template>
  <section class="stack-lg">
    <div class="card stack-md profile-edit-card">
      <div class="section-head compact-title-head">
        <h1>个人资料</h1>
      </div>

      <div class="settings-summary-grid profile-readonly-grid">
        <div class="settings-summary-item">
          <span>注册号</span>
          <strong>{{ userStore.mobile || '未获取' }}</strong>
        </div>
      </div>

      <div class="form-grid two-col profile-edit-grid">
        <label>
          昵称
          <input v-model.trim="profile.nickname" placeholder="请输入昵称" />
        </label>
        <label>
          姓名
          <input v-model.trim="profile.surname" placeholder="请输入姓名" />
        </label>
        <label>
          生日
          <input v-model.trim="profile.birthday" placeholder="YYYY-MM-DD" />
        </label>
        <div class="profile-city-field two-col-wide">
          <span>城市</span>
          <div class="profile-city-select-grid">
            <label>
              <select v-model="profile.province">
                <option value="">请选择省</option>
                <option v-for="item in regionTree" :key="item.label" :value="item.label">{{ item.label }}</option>
              </select>
            </label>
            <label>
              <select v-model="profile.city_name" :disabled="!cityOptions.length">
                <option value="">请选择市</option>
                <option v-for="item in cityOptions" :key="item.label" :value="item.label">{{ item.label }}</option>
              </select>
            </label>
            <label>
              <select v-model="profile.district" :disabled="!districtOptions.length">
                <option value="">请选择县 / 区</option>
                <option v-for="item in districtOptions" :key="item.code || item.label" :value="item.value || item.label">{{ item.label }}</option>
              </select>
            </label>
          </div>
        </div>
        <label>
          性别
          <select v-model="profile.gender">
            <option :value="0">保密</option>
            <option :value="1">男</option>
            <option :value="2">女</option>
          </select>
        </label>
      </div>

      <button class="primary-btn centered-form-btn" type="button" @click="handleSaveProfile">保存资料</button>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiAccountProfileSave } from '../api/account'
import { useUserStore } from '../stores/user'
import { buildLocation, parseLocationParts } from '../utils/format'
import { fetchRegionTree } from '../api/region'
import { findRegionProvince } from '../api/region-helpers'

const router = useRouter()
const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const locationParts = parseLocationParts(userStore.profile.city)
const regionTree = ref([])
const profile = reactive({
  nickname: userStore.profile.nickname || '',
  surname: userStore.profile.surname || '',
  province: userStore.profile.province || locationParts.province || '',
  city_name: userStore.profile.city_name || locationParts.city || '',
  district: userStore.profile.district || locationParts.district || '',
  birthday: userStore.profile.birthday || '',
  gender: userStore.profile.gender ?? 0
})

const cityOptions = computed(() => findRegionProvince(regionTree.value, profile.province)?.cities || [])
const districtOptions = computed(() => cityOptions.value.find((item) => item.label === profile.city_name)?.districts || [])
const cityDisplay = computed(() => buildLocation({ province: profile.province, city: profile.city_name, district: profile.district }))

watch(() => profile.province, (value) => {
  const firstCity = findRegionProvince(regionTree.value, value)?.cities?.[0]?.label || ''
  if (!cityOptions.value.some((item) => item.label === profile.city_name)) {
    profile.city_name = firstCity
  }
})

watch(() => profile.city_name, (value) => {
  const districts = cityOptions.value.find((item) => item.label === value)?.districts || []
  if (!districts.some((item) => (item.value || item.label) === profile.district)) {
    profile.district = districts[0]?.value || districts[0]?.label || ''
  }
})


onMounted(async () => {
  try {
    regionTree.value = await fetchRegionTree()
  } catch (error) {
    success.value = false
    message.value = error?.message || '地区数据加载失败，请检查 /tp8api/api/region/tree'
    regionTree.value = []
  }
})

async function handleSaveProfile() {
  try {
    const payload = {
      nickname: profile.nickname,
      surname: profile.surname,
      city: cityDisplay.value,
      province: profile.province,
      city_name: profile.city_name,
      district: profile.district,
      birthday: profile.birthday,
      gender: profile.gender
    }
    const res = await apiAccountProfileSave(payload)
    userStore.setProfile({
      ...payload,
      province: profile.province,
      city_name: profile.city_name,
      district: profile.district
    })
    success.value = true
    message.value = res.message || '保存成功'
    setTimeout(() => router.push('/account-settings'), 500)
  } catch (error) {
    success.value = false
    message.value = error.message || '保存资料失败'
  }
}
</script>
