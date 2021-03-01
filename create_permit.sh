#!/bin/sh

ts-node scripts/create_permit.js --secret edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq --contract_address KT1SRi7MGa6fJPyCxhsAMxgTinyxRm16sQrp --to tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6 --amount 996 --relayer_address tz1TfRXkAxbQ2BFqKV2dF4kE17yZ5BmJqSAP > fixtures/submit_permit.json