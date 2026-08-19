import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isLocal = (process.env.ENVIRONMENT ?? 'local') === 'local'

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'water-availability-aggregator'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  backend: {
    baseUrl: {
      doc: 'Base URL for the backend service',
      format: String,
      default: 'http://localhost:3001',
      env: 'BACKEND_BASE_URL'
    },
    heartbeatAuthToken: {
      doc: 'Bearer token used for backend heartbeat requests outside local development',
      format: String,
      nullable: true,
      default: null,
      env: 'AGGREGATOR_HEARTBEAT_AUTH_TOKEN'
    }
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  scheduler: {
    enabled: {
      doc: 'Enable scheduler heartbeat job',
      format: Boolean,
      default: false,
      env: 'AGGREGATOR_JOB_ENABLED'
    },
    intervalMs: {
      doc: 'Scheduler heartbeat interval in milliseconds',
      format: 'nat',
      default: 60 * 60 * 1000,
      env: 'AGGREGATOR_JOB_INTERVAL_MS'
    }
  },
  dataSources: {
    defra: {
      baseUrl: {
        doc: 'Base URL for Defra Data Services Platform OGC Features API',
        format: String,
        default:
          'https://environment.data.gov.uk/geoservices/datasets/394cde56-5cf9-42bf-8d20-86c182f9ce68/ogc/features/v1',
        env: 'DEFRA_OGC_BASE_URL'
      },
      timeoutMs: {
        doc: 'Timeout in milliseconds for Defra OGC requests',
        format: 'nat',
        default: 8000,
        env: 'DEFRA_OGC_TIMEOUT_MS'
      },
      defaultCollectionId: {
        doc: 'Optional default Defra OGC collection id to query first',
        format: String,
        nullable: true,
        default: null,
        env: 'DEFRA_OGC_COLLECTION_ID'
      }
    },
    stub: {
      fallbackEnabled: {
        doc: 'Allow sample route to return stub data when remote Defra source is unavailable',
        format: Boolean,
        default: isLocal,
        env: 'DATA_STUB_FALLBACK_ENABLED'
      }
    }
  }
})

config.validate({ allowed: 'strict' })
