import { ProjectConfigOptions } from '@medusajs/medusa/dist/types/global'

declare module '@medusajs/medusa/dist/types/global' {
  interface ProjectConfigOptions {
    redisToken?: string
  }
}
