import { PrismaClient, AuditAction, AuditTarget, SharePermission } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Adjust these if your seed used different emails
  const owner = await prisma.user.findUniqueOrThrow({ where: { emailLower: 'basic@example.com' } })
  const provider = await prisma.user.findUniqueOrThrow({ where: { emailLower: 'admin@example.com' } })

  // 1) Create a demo encrypted file (ciphertext only, as per design)
  const file = await prisma.file.create({
    data: {
      ownerId: owner.id,
      bucket: 'trustbridge-dev',
      objectKey: `ciphertexts/dev/${Date.now()}.bin`,
      size: BigInt(1_234_567),
      mimeType: 'application/pdf',
      etag: 'W/"demo-etag"',
      sha256: 'deadbeefcafebabe',

      encFileKey: Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
      encFileKeyAlg: 'RSA-OAEP-256',
      iv: Buffer.from('aabbccddeeff001122334455', 'hex'),

      filenameCipher: 'BASE64_ENCRYPTED_filename.pdf',
      notesCipher: 'BASE64_ENCRYPTED_note',
    },
  })

  // 2) Share it with the provider (READ)
  const share = await prisma.share.create({
    data: {
      fileId: file.id,
      granteeId: provider.id,
      createdById: owner.id,
      permission: SharePermission.READ,
    },
  })

  // 3) Audit events (upload + share)
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: owner.id,
        action: AuditAction.FILE_UPLOAD,
        target: AuditTarget.FILE,
        targetId: file.id,
        fileId: file.id,
        ip: '127.0.0.1',
        userAgent: 'dev-populate',
        metadata: { bytes: 1_234_567, mimeType: 'application/pdf' } as any,
      },
      {
        actorId: owner.id,
        action: AuditAction.FILE_SHARE,
        target: AuditTarget.SHARE,
        targetId: share.id,
        fileId: file.id,
        shareId: share.id,
        ip: '127.0.0.1',
        userAgent: 'dev-populate',
        metadata: { granteeId: provider.id, permission: 'READ' } as any,
      },
    ],
  })

  // Fetch with relations so you can see everything in the console
  const hydrated = await prisma.file.findUniqueOrThrow({
    where: { id: file.id },
    include: {
      shares: true,
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 5,
      },
      owner: {
        select: { id: true, emailLower: true, role: true },
      },
    },
  })

  console.log('✅ Created demo file/share/logs')
  console.log({
    file: { id: hydrated.id, objectKey: hydrated.objectKey, size: String(hydrated.size) },
    owner: hydrated.owner,
    shares: hydrated.shares.map(s => ({ id: s.id, granteeId: s.granteeId })),
    latestAudit: hydrated.auditLogs.map(a => ({ action: a.action, target: a.target, ts: a.timestamp })),
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
