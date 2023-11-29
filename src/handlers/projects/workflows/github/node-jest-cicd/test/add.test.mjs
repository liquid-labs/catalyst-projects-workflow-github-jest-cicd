/* global beforeAll describe expect fail test */
import { existsSync } from 'node:fs'
import * as fsPath from 'node:path'

import * as addHandler from '../add'

const testPkgPath = fsPath.join(__dirname, 'data', 'pkgA')

describe('PUT:/projects/workflows/github/node-jest-cicd/add', () => {
  let body

  const appMock = {}

  const mockReq = {
    accepts : () => 'application/json',
    get     : (header) => header === 'X-CWD' ? testPkgPath : undefined,
    vars    : {}
  }

  const mockRes = {
    type  : () => {},
    write : (json) => { body = JSON.parse(json) },
    end   : () => {}
  }

  const reporterMock = { isolate : () => {}, log : () => {}, push : () => {} }

  beforeAll(async() => {
    const handler = addHandler.func({ app : appMock, reporter : reporterMock })
    await handler(mockReq, mockRes)
  })

  test('returns data pointing to the script', () => {
    const { artifacts } = body
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0].path).toBe('.github/workflows/unit-tests-node.yaml')
  })

  test('creates the script in the expected location', async() => {
    const scriptPath = fsPath.join(testPkgPath, '.github', 'workflows', 'unit-tests-node.yaml')
    expect(existsSync(scriptPath)).toBe(true)
  })

  test("saves '.sdlc-data.yaml'", () => {
    const sdlcDataPath = fsPath.join(testPkgPath, '.sdlc-data.yaml')
    expect(existsSync(sdlcDataPath)).toBe(true)
  })

  test("setting both 'noPush' and 'noPullRequest' results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { vars : { noPush : true, noPullRequest : true } })
    const handler = addHandler.func({ app : appMock, reporter : reporterMock })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/pull-request and push/)
    }
  })

  test("lack of a 'X-CWD' header results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { get : () => undefined })
    const handler = addHandler.func({ app : appMock, reporter : reporterMock })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/X-CWD/)
    }
  })
})
