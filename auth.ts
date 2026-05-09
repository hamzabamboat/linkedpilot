import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider !== 'google') return true

        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('google_id', account.providerAccountId)
          .maybeSingle()

        if (!existingUser) {
          const { error } = await supabaseAdmin.from('users').insert({
            google_id: account.providerAccountId,
            auth_provider: 'google',
            email: user.email,
            linkedin_name: user.name,
            linkedin_picture: user.image,
            updated_at: new Date().toISOString(),
          })
          if (error) {
            console.error('NextAuth: failed to insert user:', error.message)
            return false
          }
        }
        return true
      } catch (err) {
        console.error('NextAuth signIn error:', err)
        return false
      }
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/api/auth/google/callback`
    },
    async session({ session }) {
      return session
    },
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.googleId = account.providerAccountId
      }
      return token
    },
  },
})
