declare module '@galaxies/shared/envNames' {
  const ENV: Record<string, string>
  export default ENV
}

declare module '@galaxies/shared/appPaths' {
  export const paymentReturn: string
  export const resetPassword: string
  export const paymentsIpn: string
  export const paymentsReturn: string
}
