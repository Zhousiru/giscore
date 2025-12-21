export type ApiResponseOk<T> = {
  success: true
  msg: string
  data: T
}

export type ApiResponseFail = {
  success: false
  msg: string
}

export function Ok<T>(data: T): ApiResponseOk<T> {
  return {
    success: true,
    msg: 'ok',
    data,
  }
}

export function Fail(msg: string): ApiResponseFail {
  return {
    success: false,
    msg,
  }
}
