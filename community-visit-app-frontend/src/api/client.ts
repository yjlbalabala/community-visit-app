import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8099/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 响应拦截器：统一解包 + 错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error?.response?.data?.message || error.message || '网络错误'
    console.error('[API Error]', msg)
    return Promise.reject(error)
  }
)

export default apiClient
