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

function categorizePost(title: string, text: string, subreddit: string): string {
  const content = (title + " " + text).toLowerCase()

  // More specific matching patterns
  if (content.match(/moto\s*g\d+|motog\d+|moto g series/i)) return "Moto G Series"
  if (content.match(/edge\s*\d+|moto edge|motorola edge/i)) return "Moto Edge Series"
  if (content.match(/razr|flip|foldable/i)) return "Moto Razr/Foldable"
  if (content.match(/buds|headphone|earbuds|audio|speaker/i)) return "Audio Products"
  if (content.match(/smart home|hub|monitor/i)) return "Smart Home"
  if (content.match(/charger|case|accessory|screen protector/i)) return "Accessories"
  if (content.match(/battery|charging|power/i)) return "Battery/Charging"
  if (content.match(/camera|photo|video/i)) return "Camera"
  if (content.match(/software|update|android|ui/i)) return "Software/Updates"

  return "General"
}

function simpleAnalyzeSentiment(
  title: string,
  text: string,
): { sentiment: "positive" | "neutral" | "negative"; confidence: number; reasoning: string } {
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
    "beautiful",
    "smooth",
    "fast",
    "reliable",
    "worth",
    "upgrade",
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
    "slow",
    "lag",
    "crash",
    "buggy",
    "defect",
    "regret",
  ]

  const positiveCount = positiveWords.filter((word) => content.includes(word)).length
  const negativeCount = negativeWords.filter((word) => content.includes(word)).length

  // Calculate confidence based on keyword density
  const totalWords = content.split(/\s+/).length
  const sentimentWords = positiveCount + negativeCount
  const confidence = Math.min(Math.round((sentimentWords / Math.max(totalWords / 10, 1)) * 100), 95)

  let sentiment: "positive" | "neutral" | "negative"
  let reasoning: string

  if (positiveCount > negativeCount + 1) {
    sentiment = "positive"
    reasoning = `Found ${positiveCount} positive indicators`
  } else if (negativeCount > positiveCount + 1) {
    sentiment = "negative"
    reasoning = `Found ${negativeCount} negative indicators`
  } else {
    sentiment = "neutral"
    reasoning = "Mixed or neutral sentiment indicators"
  }

  return { sentiment, confidence: Math.max(confidence, 40), reasoning }
}

async function analyzeSentiment(
  title: string,
  text: string,
): Promise<{ sentiment: "positive" | "neutral" | "negative"; confidence: number; reasoning: string }> {
  return simpleAnalyzeSentiment(title, text)
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
  const primarySubreddit = "motorola"
  const secondarySubreddits = ["MotoG", "Android", "smartphones", "Lenovo"]
  const allPosts: RedditPost[] = []

  // Fetch more posts from primary r/motorola subreddit
  try {
    const response = await fetch(`https://oauth.reddit.com/r/${primarySubreddit}/hot?limit=50&t=month`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "LenovoReviewsTracker/1.0",
      },
    })

    if (response.ok) {
      const data: RedditResponse = await response.json()
      allPosts.push(...data.data.children.map((child) => child.data))
      console.log(`[v0] Fetched ${data.data.children.length} posts from r/${primarySubreddit}`)
    }
  } catch (error) {
    console.error(`[v0] Error fetching from r/${primarySubreddit}:`, error)
  }

  // Fetch from secondary subreddits with search
  for (const subreddit of secondarySubreddits) {
    try {
      const response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/search?q=motorola OR lenovo OR "moto g" OR "moto edge"&sort=hot&limit=15&t=month`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "LenovoReviewsTracker/1.0",
          },
        },
      )

      if (response.ok) {
        const data: RedditResponse = await response.json()
        allPosts.push(...data.data.children.map((child) => child.data))
      }
    } catch (error) {
      console.error(`[v0] Error fetching from r/${subreddit}:`, error)
    }
  }

  // Remove duplicates and filter relevant posts
  const uniquePosts = Array.from(
    new Map(
      allPosts
        .filter((post) => {
          const content = (post.title + " " + post.selftext).toLowerCase()
          if (post.subreddit.toLowerCase() === "motorola") return true
          return (
            content.includes("motorola") ||
            content.includes("moto") ||
            content.includes("lenovo") ||
            content.match(/moto\s*g|edge|razr/i)
          )
        })
        .map((post) => [post.id, post]),
    ).values(),
  )

  return uniquePosts
    .sort((a, b) => {
      // Give r/motorola posts priority
      if (a.subreddit.toLowerCase() === "motorola" && b.subreddit.toLowerCase() !== "motorola") return -1
      if (b.subreddit.toLowerCase() === "motorola" && a.subreddit.toLowerCase() !== "motorola") return 1
      // Then sort by engagement
      return b.ups + b.num_comments - (a.ups + a.num_comments)
    })
    .slice(0, 25)
}

export async function GET() {
  try {
    const accessToken = await getRedditAccessToken()

    const posts = await fetchRedditPosts(accessToken)
    console.log(`[v0] Fetched ${posts.length} posts from Reddit`)

    const reviews = await Promise.all(
      posts.map(async (post, index) => {
        const sentimentAnalysis = await analyzeSentiment(post.title, post.selftext)

        return {
          id: index + 1,
          title: post.title,
          summary: post.selftext
            ? post.selftext.substring(0, 250).trim() + (post.selftext.length > 250 ? "..." : "")
            : "No description available",
          category: categorizePost(post.title, post.selftext, post.subreddit),
          sentiment: sentimentAnalysis.sentiment,
          confidence: sentimentAnalysis.confidence,
          reasoning: sentimentAnalysis.reasoning,
          upvotes: post.ups,
          comments: post.num_comments,
          redditUrl: `https://reddit.com${post.permalink}`,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          subreddit: post.subreddit,
        }
      }),
    )

    console.log(`[v0] Processed ${reviews.length} reviews with keyword-based sentiment analysis`)

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("[v0] Reddit API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Reddit data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
