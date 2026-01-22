// Mock S3 cho testing (không cần AWS credentials)
const imageStore = new Map();

class MockS3 {
    async send(command) {
        if (command.constructor.name === 'PutObjectCommand') {
            // Upload file
            const { Bucket, Key, Body, ContentType } = command.input || command;
            imageStore.set(Key, {
                body: Body,
                contentType: ContentType
            });
            return {};
        } else if (command.constructor.name === 'DeleteObjectCommand') {
            // Delete file
            const { Bucket, Key } = command.input || command;
            imageStore.delete(Key);
            return {};
        }
        return {};
    }
}

module.exports = new MockS3();