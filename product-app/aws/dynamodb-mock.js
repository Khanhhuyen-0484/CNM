// Mock DynamoDB cho testing (không cần AWS credentials)
const products = new Map();

class MockDynamoDB {
    async send(command) {
        const { TableName, Key, Item, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = command.input || command;

        if (command.constructor.name === 'ScanCommand') {
            // GET all products
            return { Items: Array.from(products.values()) };
        } else if (command.constructor.name === 'GetCommand') {
            // GET one product
            const product = products.get(Key.id);
            return { Item: product };
        } else if (command.constructor.name === 'PutCommand') {
            // CREATE product
            products.set(Item.id, Item);
            return { Item };
        } else if (command.constructor.name === 'UpdateCommand') {
            // UPDATE product
            const product = products.get(Key.id);
            if (product) {
                // Simple update logic
                if (ExpressionAttributeValues[':n']) product.name = ExpressionAttributeValues[':n'];
                if (ExpressionAttributeValues[':p']) product.price = ExpressionAttributeValues[':p'];
                if (ExpressionAttributeValues[':q']) product.quantity = ExpressionAttributeValues[':q'];
                if (ExpressionAttributeValues[':img']) product.url_image = ExpressionAttributeValues[':img'];
            }
            return { Item: product };
        } else if (command.constructor.name === 'DeleteCommand') {
            // DELETE product
            products.delete(Key.id);
            return {};
        }
    }
}

module.exports = new MockDynamoDB();