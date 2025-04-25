module.exports = (sequelize, DataTypes) => {
  const Test = sequelize.define('Test', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Add your fields here
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  });

  Test.associate = (models) => {
    // Define associations here
  };

  return Test;
};