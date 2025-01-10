
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    exampleField: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Product.associate = (models) => {
    // Define associations here
    // Example: Product.hasMany(models.OtherModel);
  };

  return Product;
};
