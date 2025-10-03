import { NextResponse } from "next/server"

interface RedditPost {
  id: string
  title: string
  selftext: string
  subreddit: string
  ups: number
  num_comments: number
  permalink: string
  created_utc: number
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost
    }>
  }
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(title: string, text: string): "positive" | "neutral" | "negative" {
  const content = (title + " " + text).toLowerCase()

  const positiveWords = [
    "great",
    "amazing",
    "excellent",
    "love",
    "perfect",
    "awesome",
    "fantastic",
    "good",
    "best",
    "impressed",
    "recommend",
    "solid",
    "happy",
    "satisfied",
  ]
  const negativeWords = [
    "terrible",
    "awful",
    "hate",
    "worst",
    "bad",
    "horrible",
    "disappointed",
    "broken",
    "issues",
    "problem",
    "failed",
    "useless",
    "garbage",
    "overheating",
  ]

  const positiveCount = positiveWords.filter((word) => content.includes(word)).length
  const negativeCount = negativeWords.filter((word) => content.includes(word)).length

  if (positiveCount > negativeCount) return "positive"
  if (negativeCount > positiveCount) return "negative"
  return "neutral"
}

// Categorize posts based on content
function categorizePost(title: string, text: string, subreddit: string): string {
  const content = (title + " " + text).toLowerCase()

  if (content.includes("moto g") || content.includes("motog")) return "Moto G Series"
  if (content.includes("edge") || content.includes("moto edge")) return "Moto Edge Series"
  if (content.includes("buds") || content.includes("headphone") || content.includes("audio")) return "Motorola Audio"
  if (content.includes("smart home") || content.includes("hub")) return "Smart Home"
  if (content.includes("charger") || content.includes("case") || content.includes("accessory")) return "Accessories"

  return "General"
}

async function getRedditAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Reddit credentials not configured")
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MotorolaReviewsTracker/1.0",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get Reddit access token")
  }

  const data = await response.json()
  return data.access_token
}

async function fetchRedditPosts(accessToken: string): Promise<RedditPost[]> {
  const subreddits = ["motorola", "MotoG", "Android", "smartphones"]
  const queries = ["motorola", "moto g", "moto edge", "motorola phone"]

  const allPosts: RedditPost[] = []

  // Fetch from multiple subreddits
  for (const subreddit of subreddits) {
    try {
      const response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/search?q=motorola&sort=hot&limit=25&t=month`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "MotorolaReviewsTracker/1.0",
          },
        },
      )

      if (response.ok) {
        const data: RedditResponse = await response.json()
        allPosts.push(...data.data.children.map((child) => child.data))
      }
    } catch (error) {
      console.error(`Error fetching from r/${subreddit}:`, error)
    }
  }

  // Remove duplicates and filter relevant posts
  const uniquePosts = allPosts.filter(
    (post, index, self) =>
      (index === self.findIndex((p) => p.id === post.id) && post.title.toLowerCase().includes("motorola")) ||
      post.title.toLowerCase().includes("moto") ||
      post.selftext.toLowerCase().includes("motorola"),
  )

  return uniquePosts.slice(0, 20) // Limit to 20 most relevant posts
}

export async function GET() {
  try {
    console.log("[v0] Starting Reddit API fetch...")

    const accessToken = await getRedditAccessToken()
    console.log("[v0] Got Reddit access token")

    const posts = await fetchRedditPosts(accessToken)
    console.log(`[v0] Fetched ${posts.length} posts from Reddit`)

    const reviews = posts.map((post, index) => ({
      id: index + 1,
      title: post.title,
      summary: post.selftext ? post.selftext.substring(0, 200) + "..." : "No description available",
      category: categorizePost(post.title, post.selftext, post.subreddit),
      sentiment: analyzeSentiment(post.title, post.selftext),
      upvotes: post.ups,
      comments: post.num_comments,
      redditUrl: `https://reddit.com${post.permalink}`,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
    }))

    console.log("[v0] Processed reviews with sentiment analysis")

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("[v0] Reddit API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Reddit data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
