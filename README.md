# Dockerized Django REST API

This is simple Django REST API build with Django REST Framework.
It is dockerized using docker-compose.
It uses PostgreSQL as database.

## Purpose

This project was a task for a job interview.
The purpose of this project is to demonstrate my skills in designing, building, documenting and testing REST API.
I chose to use Django REST Framework because it is a very popular framework for building REST APIs in Python and I
wanted to try it out. I selected PostgreSQL as the database because it is the most popular database for today's web
applications.

## Requirements

- Docker

## Installation

### Clone the repository

``git clone https://github.com/Jeb4dev/django-rest-api.git``

### Build and run the containers

``docker-compose up --build -d``

### Run the migrations

``docker-compose exec web python manage.py migrate``

#### Create a superuser - Optional

``docker-compose exec web python manage.py createsuperuser``

#### Run the tests - Optional

``docker-compose exec web python manage.py test``

---

## Development

### Migration

If you make changes to the models, you will need to create migrations and run them to update the database.

``docker-compose exec web python manage.py makemigrations``
``docker-compose exec web python manage.py migrate``

### Running without Docker

#### Install the requirements

``pip install -r requirements.txt`` found in /app directory.

Set up the environment variables in ``dev.env`` file

#### Run the server

``python manage.py runserver``

## API Documentation

The API documentation is available at [localhost:8000](http://localhost:8000/). It has been generated using
[Swagger](https://swagger.io/).

## License

This project is licensed under the MIT License.
