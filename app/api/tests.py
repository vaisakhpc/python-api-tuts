from rest_framework.test import APIClient
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import User


class UserTestCase(APITestCase):

    """
    Test suite for User endpoints
    """

    def setUp(self):
        self.client = APIClient()
        self.data = {"name": "John Doe", "email": "john@example.com", "age": 20}

    def create_test_user(self, name="John Doe", email="john@example.com", age=20):
        """
        Create dummy user for testing
        """
        data = {"name": name, "email": email, "age": age}

        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ----------------- POST -----------------
    # Test /users/add endpoint

    def test_create_user(self):
        """
        Test API: Create new user with correct data.
        """
        data = self.data
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().name, "John Doe")

    def test_create_user_without_name(self):
        """
        Test API: Create new user when name is not in data.
        """
        data = self.data
        data.pop("name")
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_when_name_equals_blank(self):
        """
        Test API: Create new user when name is blank.
        """
        data = self.data
        data["name"] = ""
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_without_email(self):
        """
        Test API: Create new user when email is not in data.
        """
        data = self.data
        data.pop("email")
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_when_email_equals_blank(self):
        """
        Test API: Create new user when email is blank.
        """
        data = self.data
        data["email"] = ""
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_without_age(self):
        """
        Test API: Create new user when age is not in data.
        """
        data = self.data
        data.pop("age")
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_when_age_equals_blank(self):
        """
        Test API: Create new user when age is blank.
        """
        data = self.data
        data["age"] = ""
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_same_email_again(self):
        """
        Test API: Create new user when email is already exist. Email should be unique.
        """
        data = self.data
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        response = self.client.post("/api/users/add", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ----------------- GET -----------------
    # Test /user endpoint

    def test_get_all_users_when_no_users(self):
        """
        Test API: Return all users when no users.
        """
        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), 0)

    def test_get_all_users_when_one_users_exist(self):
        """
        Test API: Return all users when one user exist.
        """
        self.create_test_user()
        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(response.data[0]["name"], "John Doe")

    def test_get_all_users_when_multiple_users_exist(self):
        """
        Test API: Return all users when multiple users exist.
        """
        # Create multiple users
        self.create_test_user()
        self.create_test_user("Jane Doe", "jane@example.com", 21)
        self.create_test_user("James Doe", "james@example.com", 64)

        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), 3)
        self.assertEqual(response.data[0]["name"], "John Doe")
        self.assertEqual(response.data[1]["name"], "Jane Doe")
        self.assertEqual(response.data[2]["name"], "James Doe")

    # ----------------- GET -----------------
    # Test /user endpoint

    def test_get_user_without_email_parameter(self):
        """
        Test API: Return user by email when no email parameter.
        """
        response = self.client.get("/api/users?email=")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_user_when_no_users(self):
        """
        Test API: Return user by email when no user records exist.
        """
        response = self.client.get("/api/users?email=wrongemail@example.com")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_user_when_one_user_exist(self):
        """
        Test API: Return user by email when one user exist.
        """
        self.create_test_user()

        data = self.data
        response = self.client.get(f"/api/users?email={data['email']}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.data["name"])

    def test_get_user_when_multiple_users_exist(self):
        """
        Test API: Return user by email when multiple users exist.
        """
        # Create multiple users
        self.create_test_user()
        self.create_test_user("Jane Doe", "jane@example.com", 21)
        self.create_test_user("James Doe", "james@example.com", 64)

        # Get specific user
        response = self.client.get("/api/users?email=jane@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Jane Doe")

    # ----------------- PUT -----------------
    # Test /users/update endpoint

    def test_update_user_without_email_parameter(self):
        """
        Test API: Update user when no users.
        """
        response = self.client.put("/api/users/update")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_with_empty_email_parameter(self):
        """
        Test API: Update user with empty email parameter.
        """
        response = self.client.put("/api/users/update?email=")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_when_no_users(self):
        """
        Test API: Update user when no users.
        """
        data = self.data
        response = self.client.put(f"/api/users/update?email={data['email']}", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_user_when_one_user(self):
        """
        Test API: Update user when no users exist.
        """
        self.create_test_user()
        data = self.data
        response = self.client.put(f"/api/users/update?email={data['email']}", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_user_when_multiple_users_exist(self):
        """
        Test API: Update user when multiple users exist.
        """
        # Create multiple users
        self.create_test_user()
        self.create_test_user("Jane Doe", "jane@example.com", 21)
        self.create_test_user("James Doe", "james@example.com", 64)

        # Update specific user
        data = {"email": "jane@example.com", "name": "Jane Doe Updated", "age": 22}
        response = self.client.put("/api/users/update?email=jane@example.com", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["email"], "jane@example.com")
        self.assertEqual(response.data["data"]["name"], "Jane Doe Updated")
        self.assertEqual(response.data["data"]["age"], 22)

    def test_update_user_when_wrong_email_used(self):
        """
        Test API: Update user when email does not exist but users do.
        """
        self.create_test_user()
        data = self.data
        data["email"] = "email@example.com"
        response = self.client.put("/api/users/update?email=wrong_email@example.com", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ----------------- DELETE -----------------
    # Test /users/delete endpoint

    def test_delete_user_without_email_parameter(self):
        """
        Test API: Delete user when no users.
        """
        response = self.client.delete("/api/users/delete")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_user_when_no_users(self):
        """
        Test API: Delete user when no users.
        """
        data = self.data
        response = self.client.delete("/api/users/delete", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_user_when_one_user(self):
        """
        Test API: Delete user when no users.
        """
        self.create_test_user()
        data = self.data
        response = self.client.delete(f"/api/users/delete?email={data['email']}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_user_when_multiple_users_exist(self):
        """
        Test API: Delete correct user when multiple users exist.
        """
        # Create multiple users
        self.create_test_user()
        self.create_test_user("Jane Doe", "jane@example.com", 21)

        # Delete specific user
        data = self.data
        response = self.client.delete(f"/api/users/delete?email={data['email']}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(User.objects.count(), 1)

        # Check if the correct user was deleted
        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Jane Doe")

    def test_delete_user_when_wrong_email_used(self):
        """
        Test API: Delete user when correct user not found by email.
        """
        self.create_test_user()
        response = self.client.delete("/api/users/delete?email=wrong@example.com")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DocsTestCase(APITestCase):

    """
    Test suite for api documentation
    """

    def test_docs_return_200(self):
        """
        Test API: Test docs
        """
        response = self.client.get("/")
        self.assertEqual(response.status_code, status.HTTP_200_OK),

    def test_docs_title(self):
        """
        Test API: Test docs title
        """
        response = self.client.get("/")
        self.assertContains(response, "<title>Django REST API</title>")
