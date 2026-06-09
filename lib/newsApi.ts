const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID
const CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET

export async function fetchNews(keyword: string) {
  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(
        keyword
      )}&display=10&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID || '',
          'X-Naver-Client-Secret': CLIENT_SECRET || '',
        },
      }
    )

    const data = await response.json()

    return data.items || []
  } catch (error) {
    console.log('뉴스 API 오류:', error)
    return []
  }
}