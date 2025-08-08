from django.shortcuts import render

def portfolio_view(request):
    return render(request, 'portfolio.html')