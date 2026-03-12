import { NextAuthOptions, Account, Profile, User } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import FacebookProvider from 'next-auth/providers/facebook';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

// Custom TikTok OAuth provider (TikTok Login Kit v2)
const TikTokProvider = (options: { clientKey: string; clientSecret: string }) => ({
  id: 'tiktok',
  name: 'TikTok',
  type: 'oauth' as const,
  authorization: {
    url: 'https://www.tiktok.com/v2/auth/authorize/',
    params: {
      scope: 'user.info.basic,video.list',
      response_type: 'code',
      client_key: options.clientKey,
    }
  },
  token: {
    url: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
  userinfo: {
    url: 'https://open.tiktokapis.com/v2/user/info/',
    params: { fields: 'open_id,union_id,avatar_url,display_name' }
  },
  profile(profile: { data: { user: { open_id: string; display_name: string; avatar_url: string } } }) {
    const user = profile.data.user;
    return {
      id: user.open_id,
      name: user.display_name,
      email: null,
      image: user.avatar_url || null,
    };
  },
  clientId: options.clientKey,
  clientSecret: options.clientSecret,
});

// Custom Instagram OAuth provider
const InstagramProvider = (options: { clientId: string; clientSecret: string }) => ({
  id: 'instagram',
  name: 'Instagram',
  type: 'oauth' as const,
  authorization: {
    url: 'https://api.instagram.com/oauth/authorize',
    params: {
      scope: 'user_profile,user_media',
      response_type: 'code'
    }
  },
  token: {
    url: 'https://api.instagram.com/oauth/access_token',
  },
  userinfo: {
    url: 'https://graph.instagram.com/me',
    params: { fields: 'id,username,account_type' }
  },
  profile(profile: { id: string; username: string }) {
    return {
      id: profile.id,
      name: profile.username,
      email: null,
      image: null
    };
  },
  clientId: options.clientId,
  clientSecret: options.clientSecret,
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    InstagramProvider({
      clientId: process.env.NEXT_PUBLIC_META_APP_ID!,
      clientSecret: process.env.META_APP_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.NEXT_PUBLIC_META_APP_ID!,
      clientSecret: process.env.META_APP_SECRET!,
      authorization: {
        params: {
          scope: 'email,public_profile,user_posts,user_photos,user_videos'
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'r_liteprofile r_emailaddress w_member_social'
        }
      }
    }),
    TikTokProvider({
      clientKey: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: Account | null; profile?: Profile; user?: User }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.provider = token.provider as string | undefined;
      session.providerAccountId = token.providerAccountId as string | undefined;
      if (token.userId) {
        session.user.id = token.userId as string;
      } else if (token.providerAccountId) {
        session.user.id = token.providerAccountId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/dashboard',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
