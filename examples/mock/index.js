const { faker } = require('@faker-js/faker');
const mockMap = {
  'GET /api/getQueryListData': (req, res) => {
    const { page } = req.query;
    const size  = req.query.size ?? 10;
    const list = Array.from({ length: size }).map(() => ({
      id: faker.datatype.uuid(),
      username: faker.internet.userName(),
      sex: faker.datatype.number({ min: 1, max: 2 }),
      cname: faker.internet.userName(),
      email: faker.internet.email(),
      mobile: faker.phone.number(),
      department_name: faker.commerce.department(),
    }));
    setTimeout(() => {
      res.json({
        data: {
          current: +page,
          total: 18,  // You can adjust this based on the number of total mock data you want to have
          list
        }
      });
    }, 500);
  },
  'DELETE /api/user/:id': (req, res) => {
    console.log('---->', req.body);
    console.log('---->', req.params.id); // request params
    res.send({ status: 'ok', message: 'delete success!' });
  },
};

module.exports = mockMap;
